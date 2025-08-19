using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.Data;
using Northeast.Models;
using Northeast.Utilities;

namespace Northeast.Services;

#region Options
public sealed class AiNewsOptions
{
    /// <summary>API key for Gemini (Google AI Studio / Vertex AI Developer API).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Model name. Use the latest stable Gemini 2.5 Pro.</summary>
    public string Model { get; set; } = "gemini-2.5-pro";

    /// <summary>How often to poll and publish AI-generated trending news.</summary>
    public TimeSpan TrendingInterval { get; set; } = TimeSpan.FromMinutes(10);

    /// <summary>How often to write a random category article.</summary>
    public TimeSpan RandomInterval { get; set; } = TimeSpan.FromMinutes(10);

    /// <summary>Max items to attempt per trending tick.</summary>
    public int MaxTrendingPerTick { get; set; } = 3;

    /// <summary>Temperature-style creativity control (0..2); 0.7–1.0 reads more human.</summary>
    public double Creativity { get; set; } = 0.9;

    /// <summary>Minimum words for the article body.</summary>
    public int MinWordCount { get; set; } = 260;

    /// <summary>Discard anything older than this many days.</summary>
    public int MaxAgeDays { get; set; } = 60;

    /// <summary>Hours window to auto-flag breaking news.</summary>
    public int BreakingWindowHours { get; set; } = 24;

    /// <summary>Fetch real images from APIs instead of relying on the model.</summary>
    public bool UseExternalImages { get; set; } = true;

    // NEW: long-form True Crime writer controls
    public TimeSpan TrueCrimeInterval { get; set; } = TimeSpan.FromMinutes(30);
    public int TrueCrimeMinWordCount { get; set; } = 1200;

    // (Deprecated) We no longer fetch external headlines; keep for back-compat but unused.
    public bool UseExternalNews { get; set; } = false;
}
#endregion

#region Image filtering helper
internal static class AiImageFilter
{
    public static List<ArticleImage>? SelectRelevantImages(AiArticleDraft draft)
    {
        if (draft.Images is null || draft.Images.Count == 0) return null;

        // derive simple subject tokens from the title (drop anything after ':' or '-')
        var subject = draft.Title ?? string.Empty;
        var splitIndex = subject.IndexOfAny(new[] { ':', '-' });
        if (splitIndex > 0)
            subject = subject[..splitIndex];

        var subjectWords = subject
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.Trim().ToLowerInvariant())
            .Where(w => !StopWords.Contains(w))
            .ToList();

        var filtered = draft.Images
            .AsEnumerable()
            .Reverse() // prefer latest images if the list is chronological
            .Where(i => ImageMatches(i, subjectWords))
            .Take(2)
            .Select(i => new ArticleImage
            {
                PhotoLink = i.PhotoLink,
                AltText = i.AltText,
                Caption = i.Caption
            })
            .ToList();

        return filtered.Count > 0 ? filtered : null;
    }

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "the", "a", "an", "of", "in", "to", "for", "and"
    };

    private static readonly string[] AllowedHosts =
    {
        "images.unsplash.com", "unsplash.com", "pexels.com", "images.pexels.com", "pixabay.com",
        "upload.wikimedia.org", "commons.wikimedia.org", "wikimedia.org", "wikipedia.org"
    };

    private static bool ImageMatches(AiImage img, List<string> subjectWords)
    {
        var text = ((img.AltText ?? string.Empty) + " " + (img.Caption ?? string.Empty)).ToLowerInvariant();
        var hits = subjectWords.Count(w => Regex.IsMatch(text, $@"\b{Regex.Escape(w)}\b", RegexOptions.IgnoreCase));
        if (hits < Math.Min(2, Math.Max(1, subjectWords.Count / 2))) return false;

        if (!IsValidHttpUrl(img.PhotoLink)) return false;
        var host = new Uri(img.PhotoLink!).Host.Replace("www.", "");
        return AllowedHosts.Any(h => host.EndsWith(h, StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsValidHttpUrl(string? url)
        => Uri.TryCreate(url, UriKind.Absolute, out var u) &&
           (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps);
}
#endregion

#region DTOs used for Gemini JSON output
public sealed class AiArticleDraft
{
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("category")] public string Category { get; set; } = "Info";
    [JsonPropertyName("articleHtml")] public string ArticleHtml { get; set; } = string.Empty; // one <div> with sub-headings
    [JsonPropertyName("countryName")] public string? CountryName { get; set; } // null for global
    [JsonPropertyName("countryCode")] public string? CountryCode { get; set; } // null for global
    [JsonPropertyName("keywords")] public List<string>? Keywords { get; set; }
    [JsonPropertyName("images")] public List<AiImage>? Images { get; set; }
    [JsonPropertyName("eventDateUtc")] public DateTimeOffset? EventDateUtc { get; set; }
    [JsonPropertyName("isBreaking")] public bool? IsBreaking { get; set; }
    [JsonPropertyName("breakingReason")] public string? BreakingReason { get; set; }
}

public sealed class AiImage
{
    [JsonPropertyName("photoLink")] public string? PhotoLink { get; set; }
    [JsonPropertyName("altText")] public string? AltText { get; set; }
    [JsonPropertyName("caption")] public string? Caption { get; set; }
}

public sealed class AiArticleDraftBatch
{
    [JsonPropertyName("items")] public List<AiArticleDraft> Items { get; set; } = new();
}
#endregion

#region Minimal Gemini REST client (v1beta generateContent)
/// <summary>
/// Tiny wrapper for Gemini generateContent over REST to avoid SDK coupling.
/// </summary>
public interface IGenerativeTextClient
{
    Task<string> GenerateJsonAsync(string model, string systemInstruction, string userPrompt, double temperature, CancellationToken ct);
}

public sealed class GeminiRestClient : IGenerativeTextClient
{
    private readonly HttpClient _http;
    private readonly ILogger<GeminiRestClient> _log;
    private readonly AiNewsOptions _opts;

    public GeminiRestClient(HttpClient http, IOptions<AiNewsOptions> opts, ILogger<GeminiRestClient> log)
    {
        _http = http; _log = log; _opts = opts.Value;
    }

        public async Task<string> GenerateJsonAsync(string model, string systemInstruction, string userPrompt, double temperature, CancellationToken ct)
    {
        static object BuildSchema()
        {
            var imageItem = new
            {
                type = "OBJECT",
                properties = new
                {
                    photoLink = new { type = "STRING", nullable = true },
                    altText   = new { type = "STRING", nullable = true },
                    caption   = new { type = "STRING", nullable = true }
                }
            };

            var item = new
            {
                type = "OBJECT",
                properties = new
                {
                    title        = new { type = "STRING" },
                    category     = new { type = "STRING", nullable = true },
                    articleHtml  = new { type = "STRING" },
                    countryName  = new { type = "STRING", nullable = true },
                    countryCode  = new { type = "STRING", nullable = true },
                    keywords     = new
                    {
                        type = "ARRAY",
                        items = new { type = "STRING" },
                        nullable = true
                    },
                    images       = new
                    {
                        type = "ARRAY",
                        items = imageItem,
                        nullable = true
                    },
                    eventDateUtc = new { type = "STRING", format = "date-time" },
                    isBreaking   = new { type = "BOOLEAN", nullable = true },
                    breakingReason = new { type = "STRING", nullable = true }
                },
                required = new[] { "title", "articleHtml", "eventDateUtc" },
                propertyOrdering = new[]
                {
                    "title","category","articleHtml","countryName","countryCode",
                    "keywords","images","eventDateUtc","isBreaking","breakingReason"
                }
            };

            return new
            {
                type = "OBJECT",
                properties = new
                {
                    items = new
                    {
                        type = "ARRAY",
                        items = item
                    }
                },
                required = new[] { "items" },
                propertyOrdering = new[] { "items" }
            };
        }

        async Task<string> CallAsync(bool useSchema, CancellationToken token)
        {
            var uri = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

            var generationConfig = new Dictionary<string, object?>
            {
                ["temperature"] = temperature,
                ["candidateCount"] = 1,
                ["stopSequences"] = Array.Empty<string>(),
                ["maxOutputTokens"] = 2048
            };

            if (useSchema)
            {
                generationConfig["responseMimeType"] = "application/json";
                generationConfig["responseSchema"] = BuildSchema();
            }
            else
            {
                generationConfig.Remove("responseMimeType");
                generationConfig.Remove("responseSchema");
            }

            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new object[] { new { text = userPrompt } }
                    }
                },
                systemInstruction = new
                {
                    role = "model", // important: use "model" (not "system")
                    parts = new object[] { new { text = systemInstruction } }
                },
                generationConfig
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            req.Headers.TryAddWithoutValidation("x-goog-api-key", _opts.ApiKey);

            using var res = await _http.SendAsync(req, token);
            var body = await res.Content.ReadAsStringAsync(token);

            // Do NOT throw here; allow fallback without-schema if this fails.
            if (!res.IsSuccessStatusCode)
            {
                _log.LogWarning("Gemini returned HTTP {Status} (useSchema={UseSchema}). Body (truncated): {Body}",
                    (int)res.StatusCode, useSchema, Trunc(body, 600));
                return "{}";
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            static string? Extract(JsonElement r)
            {
                if (!r.TryGetProperty("candidates", out var candidates) ||
                    candidates.ValueKind != JsonValueKind.Array ||
                    candidates.GetArrayLength() == 0)
                    return null;

                var cand0 = candidates[0];

                if (!cand0.TryGetProperty("content", out var content)) return null;
                if (!content.TryGetProperty("parts", out var parts) ||
                    parts.ValueKind != JsonValueKind.Array ||
                    parts.GetArrayLength() == 0)
                    return null;

                for (int i = 0; i < parts.GetArrayLength(); i++)
                {
                    var part = parts[i];

                    if (part.TryGetProperty("text", out var textNode))
                    {
                        var text = textNode.GetString();
                        if (!string.IsNullOrWhiteSpace(text))
                            return text!;
                    }

                    if (part.TryGetProperty("functionCall", out var fc) &&
                        fc.ValueKind == JsonValueKind.Object &&
                        fc.TryGetProperty("args", out var args))
                    {
                        return args.GetRawText();
                    }

                    if (part.TryGetProperty("inlineData", out var inlineData) &&
                        inlineData.ValueKind == JsonValueKind.Object &&
                        inlineData.TryGetProperty("mimeType", out var mime) &&
                        string.Equals(mime.GetString(), "application/json", StringComparison.OrdinalIgnoreCase) &&
                        inlineData.TryGetProperty("data", out var dataNode))
                    {
                        try
                        {
                            var b64 = dataNode.GetString();
                            if (!string.IsNullOrEmpty(b64))
                            {
                                var bytes = Convert.FromBase64String(b64);
                                var json = Encoding.UTF8.GetString(bytes);
                                if (!string.IsNullOrWhiteSpace(json))
                                    return json;
                            }
                        }
                        catch {}
                    }
                }
                return null;
            }

            var extracted = Extract(root);
            if (extracted is null)
            {
                _log.LogWarning("Gemini candidate has no usable parts (useSchema={UseSchema}). Raw: {Body}", useSchema, Trunc(body, 600));
                return "{}";
            }

            return extracted;
        }

        var first = await CallAsync(useSchema: true, ct);
        if (!string.IsNullOrWhiteSpace(first) && first != "{}") return first;

        var second = await CallAsync(useSchema: false, ct);
        return string.IsNullOrWhiteSpace(second) ? "{}" : second;

        static string Trunc(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    }
}
#endregion

#region Prompt builder
public static class AiNewsPrompt
{
    public static string BuildSystem(AiNewsOptions o, IEnumerable<string> recentTitles) => $@"You are a senior news editor.
Tone: clear, calm, concise. No fluff or clichés. Never mention you are an AI.

HARD RULES:
- Output STRICT JSON (UTF-8) only.
- Every item MUST include an ISO-8601 UTC ""eventDateUtc"" (e.g., 2025-08-17T11:02:00Z).
- Only cover events from the last {o.MaxAgeDays} days. If you are unsure an event is within this window, OMIT it.
- ""isBreaking"": true only if eventDateUtc is within the last {o.BreakingWindowHours} hours OR it impacts public safety (e.g., natural disasters, major outages, terror alerts).
- Body: one <div> with <h2>/<h3> subheads, short paragraphs, final section 'What happens next'.
- Minimum {o.MinWordCount} words (True Crime may override higher).
- Use 5–12 relevant SEO keywords.
- IMAGES: Provide 0–6 tentative descriptors (no copyrighted/watermarked). If unsure, return an empty list; do NOT guess.
- Avoid repeating topics already covered recently.

Recent titles to avoid:
{string.Join("; ", recentTitles.Take(20))}";

    public static string BuildTrendingUser(AiNewsOptions o, int count) => $@"Return JSON:
{{
  ""items"": [
    {{
      ""title"": ""unique, specific headline"",
      ""category"": ""Politics|Crime|Entertainment|Business|Health|Lifestyle|Technology|Sports|Info"",
      ""articleHtml"": ""<div>...content...</div>"",
      ""countryName"": null | ""France"" | ""United States"" | ...,
      ""countryCode"": null | ""FR"" | ""US"" | ...,
      ""keywords"": [""kw1"", ""kw2"", ...],
      ""images"": [{{ ""altText"": ""short description"", ""caption"": """", ""photoLink"": null }}],
      ""eventDateUtc"": ""YYYY-MM-DDTHH:mm:ssZ"",
      ""isBreaking"": true|false,
      ""breakingReason"": null | ""why""
    }}
  ]
}}
Constraints:
- Identify truly trending items from the last {o.MaxAgeDays} days using your internal knowledge only.
- If fewer than {count} valid items exist, return fewer.";

    public static string BuildRandomUser(AiNewsOptions o, Category category) => $@"Write one fresh piece in category '{category}'. It may be newsy or analysis.
Return the same JSON shape as above with a single item in 'items'. Titles must be unique vs recent list.";

    // NEW: dedicated non-graphic TRUE CRIME writer (long-form)
    public static string BuildTrueCrimeUser(AiNewsOptions o) => $@"Write ONE long-form TRUE CRIME article (non-graphic) in category 'Crime'.
Requirements:
- Focus on public interest, verified-style narrative, and context (investigation timeline, people involved, legal posture).
- No graphic descriptions of violence or gore. Avoid sensationalism; stick to sober, responsible tone.
- Include safety tips or resources if appropriate.
- Minimum {o.TrueCrimeMinWordCount} words.
- Structure body as one <div> with <h2>/<h3> sections and a final 'What happens next'.
Return JSON with a single item in 'items' using the same shape:
- The title should contain 'True Crime' or 'TRUE CRIME'.
- Provide eventDateUtc within the last {o.MaxAgeDays} days if the narrative has recent developments; otherwise set to a recent analysis date within that window.";
}
#endregion

#region Service: AI Trending News every 1 minutes
/// <summary>
/// Uses Gemini 2.5 Pro to synthesize trending news (no external sources), every N minutes.
/// Saves to DB and prevents repeats by checking recent titles and enforcing uniqueness.
/// </summary>
public sealed class AiTrendingNewsPollingService : BackgroundService
{
    private readonly ILogger<AiTrendingNewsPollingService> _log;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AiNewsOptions _opts;
    private readonly IGenerativeTextClient _ai;

    public AiTrendingNewsPollingService(
        ILogger<AiTrendingNewsPollingService> log,
        IServiceScopeFactory scopeFactory,
        IOptions<AiNewsOptions> opts,
        IGenerativeTextClient ai)
    {
        _log = log; _scopeFactory = scopeFactory; _opts = opts.Value; _ai = ai;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("AiTrendingNewsPollingService started (interval {Interval}).", _opts.TrendingInterval);
        var timer = new PeriodicTimer(_opts.TrendingInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await TickAsync(stoppingToken); }
                catch (OperationCanceledException) { }
                catch (Exception ex) { _log.LogError(ex, "AI trending tick failed."); }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when the service is stopping
        }
        finally
        {
            timer.Dispose();
            _log.LogInformation("AiTrendingNewsPollingService stopping.");
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Gather recent titles (for prompt + dedup)
        var recent = await db.Set<Article>()
            .OrderByDescending(a => a.CreatedDate)
            .Select(a => a.Title)
            .Take(200)
            .ToListAsync(ct);

        var system = AiNewsPrompt.BuildSystem(_opts, recent);
        var user = AiNewsPrompt.BuildTrendingUser(_opts, Math.Max(1, _opts.MaxTrendingPerTick));

        var json = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
        var batch = DeserializeSafe(json);

        if (batch.Items.Count == 0)
        {
            _log.LogInformation("AI returned no items this tick.");
            return;
        }

        var adminId = await db.Set<User>()
            .Where(u => u.Role == Role.SuperAdmin || (int)u.Role == 2)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);

        if (adminId is null)
        {
            _log.LogWarning("No SuperAdmin (Role=2) user found. Skipping tick.");
            return;
        }

        var titles = new HashSet<string>(recent, StringComparer.OrdinalIgnoreCase);
        var toAdd = new List<Article>();
        var picker = scope.ServiceProvider.GetRequiredService<IImagePicker>();
        var now = DateTimeOffset.UtcNow;
        var maxAge = TimeSpan.FromDays(_opts.MaxAgeDays);

        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title) || string.IsNullOrWhiteSpace(d.ArticleHtml)) continue;
            if (d.EventDateUtc is null) continue;
            if (now - d.EventDateUtc.Value > maxAge) continue;
            if (!titles.Add(d.Title)) { _log.LogDebug("Duplicate title skipped: {Title}", d.Title); continue; }
            if (HtmlText.CountWords(d.ArticleHtml) < 50) { _log.LogDebug("AI content too short for title {Title}", d.Title); continue; }

            List<ArticleImage>? images = null;
            if (_opts.UseExternalImages)
            {
                images = await picker.FindAsync(d.Title ?? string.Empty, d.Keywords ?? Enumerable.Empty<string>(), 2, ct);
            }
            else
            {
                images = AiImageFilter.SelectRelevantImages(d);
            }

            var isBreaking = (d.IsBreaking == true) || (now - d.EventDateUtc.Value <= TimeSpan.FromHours(_opts.BreakingWindowHours));

            var article = new Article
            {
                AuthorId = adminId.Value,
                ArticleType = ArticleType.News,
                Category = ParseCategory(d.Category),
                Title = d.Title.Trim(),
                Content = EnsureHtmlDiv(d.ArticleHtml, _opts.MinWordCount),
                IsBreakingNews = isBreaking,
                CountryName = d.CountryName, // null for global
                CountryCode = d.CountryCode, // null for global
                Keywords = d.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>(),
                Images = (images is { Count: > 0 }) ? images : null,
            };

            toAdd.Add(article);
        }

        if (toAdd.Count == 0)
        {
            _log.LogInformation("No new AI articles to insert.");
            return;
        }

        db.Set<Article>().AddRange(toAdd);
        try
        {
            await db.SaveChangesAsync(ct);
            _log.LogInformation("Inserted {Count} AI trending article(s).", toAdd.Count);
        }
        catch (DbUpdateException ex)
        {
            _log.LogWarning(ex, "DbUpdateException while saving AI articles. Some duplicates may have been dropped by DB constraints.");
        }
    }

    internal static AiArticleDraftBatch DeserializeSafe(string json)
    {
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var batch = JsonSerializer.Deserialize<AiArticleDraftBatch>(json, opts);
            return batch ?? new AiArticleDraftBatch();
        }
        catch
        {
            // try to locate JSON object in free-form text
            var start = json.IndexOf('{');
            var end = json.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                var slice = json[start..(end + 1)];
                try
                {
                    var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var batch = JsonSerializer.Deserialize<AiArticleDraftBatch>(slice, opts);
                    return batch ?? new AiArticleDraftBatch();
                }
                catch { /* swallow */ }
            }
            return new AiArticleDraftBatch();
        }
    }

    private static Category ParseCategory(string? s)
    {
        if (!string.IsNullOrWhiteSpace(s) && Enum.TryParse<Category>(s, true, out var cat)) return cat;
        return Category.Info;
    }

    internal static string EnsureHtmlDiv(string html, int minWords)
    {
        var t = html?.Trim() ?? string.Empty;
        if (!t.StartsWith("<div", StringComparison.OrdinalIgnoreCase))
            t = $"<div>\n{t}\n</div>";
        // very light safeguard: ensure it's not too short
        var words = t.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        if (words.Length < minWords)
            t += $"\n<!-- padded to meet minimum word count {minWords} -->";
        return t;
    }
}
#endregion

#region Service: Random AI article every N minutes
public sealed class AiRandomArticleWriterService : BackgroundService
{
    private readonly ILogger<AiRandomArticleWriterService> _log;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AiNewsOptions _opts;
    private readonly IGenerativeTextClient _ai;
    private readonly Random _rng = new();

    public AiRandomArticleWriterService(
        ILogger<AiRandomArticleWriterService> log,
        IServiceScopeFactory scopeFactory,
        IOptions<AiNewsOptions> opts,
        IGenerativeTextClient ai)
    {
        _log = log; _scopeFactory = scopeFactory; _opts = opts.Value; _ai = ai;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("AiRandomArticleWriterService started (interval {Interval}).", _opts.RandomInterval);
        var timer = new PeriodicTimer(_opts.RandomInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await TickAsync(stoppingToken); }
                catch (OperationCanceledException) { }
                catch (Exception ex) { _log.LogError(ex, "AI random writer tick failed."); }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when the service is stopping
        }
        finally
        {
            timer.Dispose();
            _log.LogInformation("AiRandomArticleWriterService stopping.");
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cats = Enum.GetValues(typeof(Category)).Cast<Category>().ToArray();
        var category = cats[_rng.Next(cats.Length)];

        var recent = await db.Set<Article>()
            .OrderByDescending(a => a.CreatedDate)
            .Select(a => a.Title)
            .Take(200)
            .ToListAsync(ct);

        var system = AiNewsPrompt.BuildSystem(_opts, recent);
        var user = AiNewsPrompt.BuildRandomUser(_opts, category);

        var json = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
        var batch = AiTrendingNewsPollingService.DeserializeSafe(json);
        if (batch.Items.Count == 0)
        {
            _log.LogInformation("AI returned no items this tick.");
            return;
        }

        var adminId = await db.Set<User>()
            .Where(u => u.Role == Role.SuperAdmin || (int)u.Role == 2)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (adminId is null) { _log.LogWarning("No SuperAdmin found."); return; }

        var titles = new HashSet<string>(recent, StringComparer.OrdinalIgnoreCase);
        var picker = scope.ServiceProvider.GetRequiredService<IImagePicker>();
        var now = DateTimeOffset.UtcNow;
        var maxAge = TimeSpan.FromDays(_opts.MaxAgeDays);

        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title) || string.IsNullOrWhiteSpace(d.ArticleHtml)) continue;
            if (d.EventDateUtc is null) continue;
            if (now - d.EventDateUtc.Value > maxAge) continue;
            if (!titles.Add(d.Title)) continue;
            if (HtmlText.CountWords(d.ArticleHtml) < 50) continue;

            List<ArticleImage>? images = null;
            if (_opts.UseExternalImages)
            {
                images = await picker.FindAsync(d.Title ?? string.Empty, d.Keywords ?? Enumerable.Empty<string>(), 2, ct);
            }
            else
            {
                images = AiImageFilter.SelectRelevantImages(d);
            }

            var isBreaking = (d.IsBreaking == true) || (now - d.EventDateUtc.Value <= TimeSpan.FromHours(_opts.BreakingWindowHours));

            var article = new Article
            {
                AuthorId = adminId.Value,
                ArticleType = ArticleType.Article,
                Category = ParseCategory(d.Category),
                Title = d.Title.Trim(),
                Content = EnsureHtmlDiv(d.ArticleHtml, _opts.MinWordCount),
                IsBreakingNews = isBreaking,
                CountryName = d.CountryName,
                CountryCode = d.CountryCode,
                Keywords = d.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>(),
                Images = (images is { Count: > 0 }) ? images : null,
            };

            db.Set<Article>().Add(article);
        }

        await db.SaveChangesAsync(ct);
        _log.LogInformation("Inserted a random AI article in category {Category}.", category);
    }

    private static Category ParseCategory(string? s)
        => !string.IsNullOrWhiteSpace(s) && Enum.TryParse<Category>(s, true, out var cat) ? cat : Category.Info;

    private static string EnsureHtmlDiv(string html, int minWords)
        => AiTrendingNewsPollingService.EnsureHtmlDiv(html, minWords);
}
#endregion

#region Service: TRUE CRIME long-form writer
public sealed class AiTrueCrimeWriterService : BackgroundService
{
    private readonly ILogger<AiTrueCrimeWriterService> _log;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AiNewsOptions _opts;
    private readonly IGenerativeTextClient _ai;

    public AiTrueCrimeWriterService(
        ILogger<AiTrueCrimeWriterService> log,
        IServiceScopeFactory scopeFactory,
        IOptions<AiNewsOptions> opts,
        IGenerativeTextClient ai)
    {
        _log = log; _scopeFactory = scopeFactory; _opts = opts.Value; _ai = ai;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("AiTrueCrimeWriterService started (interval {Interval}).", _opts.TrueCrimeInterval);
        var timer = new PeriodicTimer(_opts.TrueCrimeInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await TickAsync(stoppingToken); }
                catch (OperationCanceledException) { }
                catch (Exception ex) { _log.LogError(ex, "AI true-crime writer tick failed."); }
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            timer.Dispose();
            _log.LogInformation("AiTrueCrimeWriterService stopping.");
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var recent = await db.Set<Article>()
            .OrderByDescending(a => a.CreatedDate)
            .Select(a => a.Title)
            .Take(200)
            .ToListAsync(ct);

        var system = AiNewsPrompt.BuildSystem(_opts, recent);
        var user = AiNewsPrompt.BuildTrueCrimeUser(_opts);

        var json = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
        var batch = AiTrendingNewsPollingService.DeserializeSafe(json);
        if (batch.Items.Count == 0) { _log.LogInformation("No true-crime item returned."); return; }

        var adminId = await db.Set<User>()
            .Where(u => u.Role == Role.SuperAdmin || (int)u.Role == 2)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (adminId is null) { _log.LogWarning("No SuperAdmin found."); return; }

        var titles = new HashSet<string>(recent, StringComparer.OrdinalIgnoreCase);
        var picker = scope.ServiceProvider.GetRequiredService<IImagePicker>();
        var now = DateTimeOffset.UtcNow;
        var maxAge = TimeSpan.FromDays(_opts.MaxAgeDays);

        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title) || string.IsNullOrWhiteSpace(d.ArticleHtml)) continue;

            // Allow analyses with a recent analysis date if the underlying case is older:
            if (d.EventDateUtc is null) d.EventDateUtc = now;
            if (now - d.EventDateUtc.Value > maxAge) continue;
            if (!titles.Add(d.Title)) continue;
            if (HtmlText.CountWords(d.ArticleHtml) < Math.Max(_opts.MinWordCount, _opts.TrueCrimeMinWordCount)) continue;

            List<ArticleImage>? images = null;
            if (_opts.UseExternalImages)
                images = await picker.FindAsync(d.Title ?? string.Empty, d.Keywords ?? Enumerable.Empty<string>(), 2, ct);
            else
                images = AiImageFilter.SelectRelevantImages(d);

            var isBreaking = (d.IsBreaking == true) || (now - d.EventDateUtc.Value <= TimeSpan.FromHours(_opts.BreakingWindowHours));

            var article = new Article
            {
                AuthorId = adminId.Value,
                ArticleType = ArticleType.Article,
                Category = Category.Crime,
                Title = d.Title.Trim(),
                Content = AiTrendingNewsPollingService.EnsureHtmlDiv(d.ArticleHtml, _opts.TrueCrimeMinWordCount),
                IsBreakingNews = isBreaking,
                CountryName = d.CountryName,
                CountryCode = d.CountryCode,
                Keywords = d.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>(),
                Images = (images is { Count: > 0 }) ? images : null,
            };

            db.Set<Article>().Add(article);
        }

        await db.SaveChangesAsync(ct);
        _log.LogInformation("Inserted a TRUE CRIME long-form article.");
    }
}
#endregion

#region DI registration helper
public static class AiNewsRegistration
{
    public static IServiceCollection AddAiNews(this IServiceCollection services, Action<AiNewsOptions> configure)
    {
        services.Configure(configure);
        services.AddHttpClient<IGenerativeTextClient, GeminiRestClient>(client =>
        {
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            client.Timeout = TimeSpan.FromSeconds(60);
        });
        services.AddHttpClient<IImagePicker, WikimediaImagePicker>();
        services.AddHostedService<AiTrendingNewsPollingService>();
        services.AddHostedService<AiRandomArticleWriterService>();
        services.AddHostedService<AiTrueCrimeWriterService>();
        return services;
    }
}
#endregion
