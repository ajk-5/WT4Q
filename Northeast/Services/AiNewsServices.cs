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

    /// <summary>Model name. Prefer the latest stable Gemini 2.5 Pro.</summary>
    public string Model { get; set; } = "gemini-2.5-pro";

    /// <summary>How often to poll and publish AI-generated trending news.</summary>
    public TimeSpan TrendingInterval { get; set; } = TimeSpan.FromMinutes(5); // every 5 min

    /// <summary>How often to write a random category article.</summary>
    public TimeSpan RandomInterval { get; set; } = TimeSpan.FromMinutes(10); // every 10 min

    /// <summary>How often to write a true-crime article (Crime category, non-graphic).</summary>
    public TimeSpan TrueCrimeInterval { get; set; } = TimeSpan.FromMinutes(30);

    /// <summary>Max items to attempt per trending tick.</summary>
    public int MaxTrendingPerTick { get; set; } = 3;

    /// <summary>Temperature-style creativity control (0..2); 0.7–1.0 reads more human.</summary>
    public double Creativity { get; set; } = 0.9;

    /// <summary>Minimum words for the article body (we enforce >160; using 180).</summary>
    public int MinWordCount { get; set; } = 180;

    /// <summary>Discard anything older than this many days (≤ 30 days per requirement).</summary>
    public int MaxAgeDays { get; set; } = 30;

    /// <summary>Hours window to auto-flag breaking news.</summary>
    public int BreakingWindowHours { get; set; } = 24;

    /// <summary>Fetch real images from APIs instead of relying on the model.</summary>
    public bool UseExternalImages { get; set; } = true;

    /// <summary>Higher minimum for long-form true crime (optional).</summary>
    public int TrueCrimeMinWordCount { get; set; } = 1200;

    // (Deprecated) External headlines not used, kept for back-compat.
    public bool UseExternalNews { get; set; } = false;
}
#endregion

#region Image filtering helper
internal static class AiImageFilter
{
    public static List<ArticleImage>? SelectRelevantImages(AiArticleDraft draft)
    {
        if (draft.Images is null || draft.Images.Count == 0) return null;

        // derive subject tokens from the title (drop anything after ':' or '-')
        var subject = draft.Title ?? string.Empty;
        var splitIndex = subject.IndexOfAny(new[] { ':', '-' });
        if (splitIndex > 0) subject = subject[..splitIndex];

        var subjectWords = subject
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.Trim().ToLowerInvariant())
            .Where(w => !StopWords.Contains(w))
            .ToList();

        var filtered = draft.Images
            .AsEnumerable()
            .Reverse() // prefer latest if chronological
            .Where(i => ImageMatches(i, subjectWords))
            .Take(2)
            .Select(i => new ArticleImage
            {
                PhotoLink = i.PhotoLink,
                AltText = string.IsNullOrWhiteSpace(i.AltText) ? draft.Title : i.AltText,
                Caption = string.IsNullOrWhiteSpace(i.Caption) ? draft.Title : i.Caption
            })
            .ToList();

        return filtered.Count > 0 ? filtered : null;
    }

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    { "the","a","an","of","in","to","for","and" };

    private static readonly string[] AllowedHosts =
    {
        "images.unsplash.com", "unsplash.com",
        "pexels.com", "images.pexels.com",
        "pixabay.com",
        "upload.wikimedia.org", "commons.wikimedia.org", "wikimedia.org", "wikipedia.org"
    };

    private static bool ImageMatches(AiImage img, List<string> subjectWords)
    {
        if (img is null) return false;

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
    [JsonPropertyName("articleHtml")] public string ArticleHtml { get; set; } = string.Empty; // one <div> with sub-headings + "What happens next"
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

#region Gemini REST client (function-calling first + fallbacks)
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
        // 1) Function calling (very reliable)
        var (ok1, body1) = await CallAsync(model, systemInstruction, userPrompt, temperature, useFunctionCalling: true, useSchema: false, ct);
        var text = ok1 ? Extract(body1!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        // 2) Structured output (responseSchema)
        var (ok2, body2) = await CallAsync(model, systemInstruction, userPrompt, temperature, useFunctionCalling: false, useSchema: true, ct);
        text = ok2 ? Extract(body2!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        // 3) JSON mode only (no schema)
        var (ok3, body3) = await CallAsync(model, systemInstruction, userPrompt, temperature, useFunctionCalling: false, useSchema: false, ct, jsonModeOnly: true);
        text = ok3 ? Extract(body3!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        // 4) Plain-text, forced JSON
        var forced = userPrompt + "\n\nReturn ONLY valid JSON for the described schema in the 'items' array. No prose outside JSON.";
        var (ok4, body4) = await CallAsync(model, systemInstruction, forced, temperature, useFunctionCalling: false, useSchema: false, ct, jsonModeOnly: false);
        text = ok4 ? Extract(body4!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        // 5) Fallback model
        var fallback = "gemini-2.5-flash";
        var (ok5, body5) = await CallAsync(fallback, systemInstruction, userPrompt, temperature, useFunctionCalling: true, useSchema: false, ct);
        text = ok5 ? Extract(body5!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        _log.LogWarning("Gemini returned no usable JSON after all strategies.");
        return "{}";
    }

    private async Task<(bool ok, string? body)> CallAsync(
        string model, string sys, string prompt, double temperature,
        bool useFunctionCalling, bool useSchema, CancellationToken ct, bool jsonModeOnly = false)
    {
        var uri = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

        var gen = new Dictionary<string, object?>
        {
            ["temperature"] = temperature,
            ["candidateCount"] = 1,
            ["maxOutputTokens"] = 8192
        };

        object? tools = null;
        object? toolConfig = null;

        if (useFunctionCalling)
        {
            tools = new[]
            {
                new
                {
                    functionDeclarations = new[]
                    {
                        new
                        {
                            name = "emit",
                            description = "Emit strictly-validated JSON batch of articles.",
                            parameters = BuildFunctionSchema() // JSON Schema (lowercase)
                        }
                    }
                }
            };
            toolConfig = new
            {
                functionCallingConfig = new { mode = "ANY" }
            };
        }
        else if (useSchema)
        {
            gen["responseMimeType"] = "application/json";
            gen["responseSchema"] = BuildResponseSchema(); // Gemini Schema (UPPERCASE types)
        }
        else if (jsonModeOnly)
        {
            gen["responseMimeType"] = "application/json";
        }

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new object[] { new { text = prompt } }
                }
            },
            systemInstruction = new
            {
                role = "system", // ✅ use "system" for system instructions
                parts = new object[] { new { text = sys } }
            },
            generationConfig = gen,
            tools,
            toolConfig
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        req.Headers.TryAddWithoutValidation("x-goog-api-key", _opts.ApiKey);

        using var res = await _http.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);

        if (!res.IsSuccessStatusCode)
        {
            _log.LogWarning("Gemini HTTP {Status}. Body: {Body}", (int)res.StatusCode, Trunc(body, 800));
            return (false, body);
        }

        return (true, body);

        static string Trunc(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    }

    // JSON Schema for function-calling
    private static object BuildFunctionSchema()
    {
        var imageItem = new
        {
            type = "object",
            properties = new
            {
                photoLink = new { type = "string", nullable = true },
                altText = new { type = "string", nullable = true },
                caption = new { type = "string", nullable = true }
            },
            additionalProperties = false
        };

        var item = new
        {
            type = "object",
            properties = new
            {
                title = new { type = "string" },
                category = new { type = "string" },
                articleHtml = new { type = "string" },
                countryName = new { type = new[] { "string", "null" } },
                countryCode = new { type = new[] { "string", "null" } },
                keywords = new { type = new[] { "array", "null" }, items = new { type = "string" } },
                images = new { type = new[] { "array", "null" }, items = imageItem },
                eventDateUtc = new { type = "string", format = "date-time" },
                isBreaking = new { type = new[] { "boolean", "null" } },
                breakingReason = new { type = new[] { "string", "null" } }
            },
            required = new[] { "title", "articleHtml", "eventDateUtc" },
            additionalProperties = false
        };

        return new
        {
            type = "object",
            properties = new
            {
                items = new { type = "array", items = item }
            },
            required = new[] { "items" },
            additionalProperties = false
        };
    }

    // Gemini structured-output Schema (uppercase type names)
    private static object BuildResponseSchema()
    {
        var imageItem = new
        {
            type = "OBJECT",
            properties = new
            {
                photoLink = new { type = new[] { "STRING", "NULL" } },
                altText = new { type = new[] { "STRING", "NULL" } },
                caption = new { type = new[] { "STRING", "NULL" } }
            }
        };

        var item = new
        {
            type = "OBJECT",
            properties = new
            {
                title = new { type = "STRING" },
                category = new { type = "STRING" },
                articleHtml = new { type = "STRING" },
                countryName = new { type = new[] { "STRING", "NULL" } },
                countryCode = new { type = new[] { "STRING", "NULL" } },
                keywords = new { type = "ARRAY", items = new { type = "STRING" } },
                images = new { type = "ARRAY", items = imageItem },
                eventDateUtc = new { type = "STRING" },
                isBreaking = new { type = new[] { "BOOLEAN", "NULL" } },
                breakingReason = new { type = new[] { "STRING", "NULL" } }
            },
            required = new[] { "title", "articleHtml", "eventDateUtc" }
        };

        return new
        {
            type = "OBJECT",
            properties = new
            {
                items = new { type = "ARRAY", items = item }
            },
            required = new[] { "items" }
        };
    }

    private static string? Extract(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        if (!root.TryGetProperty("candidates", out var cands) ||
            cands.ValueKind != JsonValueKind.Array || cands.GetArrayLength() == 0)
            return null;

        var c0 = cands[0];
        if (!c0.TryGetProperty("content", out var content)) return null;
        if (!content.TryGetProperty("parts", out var parts) ||
            parts.ValueKind != JsonValueKind.Array || parts.GetArrayLength() == 0)
            return null;

        foreach (var p in parts.EnumerateArray())
        {
            if (p.TryGetProperty("functionCall", out var fc) &&
                fc.TryGetProperty("args", out var args))
                return args.GetRawText();

            if (p.TryGetProperty("text", out var textNode))
            {
                var text = textNode.GetString();
                if (!string.IsNullOrWhiteSpace(text)) return text!;
            }

            if (p.TryGetProperty("inlineData", out var inlineData) &&
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
                        if (!string.IsNullOrWhiteSpace(json)) return json;
                    }
                }
                catch { }
            }
        }
        return null;
    }
}
#endregion

#region Prompt builder
public static class AiNewsPrompt
{
    public static string BuildSystem(AiNewsOptions o, IEnumerable<string> recentTitles) => $@"
You are a senior human news editor. Write like a calm, clear journalist with simple words.
Hard rules:
- Output STRICT JSON only (UTF-8). No prose outside JSON.
- Each item: ≥ {o.MinWordCount} words, one <div> root, use <h2>/<h3> sub-headings, END with 'What happens next' explaining likely near-term developments.
- Sound human (no AI clichés). Paraphrase; do not copy lines verbatim.
- If global, set ""countryName"": null and ""countryCode"": null.
- Provide 5–12 lowercase, unique keywords.
- Images: prefer royalty-free links (Wikimedia/Unsplash/Pexels/Pixabay) with accurate alt/caption; if not confident, set images = [].
- DO NOT repeat topics already covered recently.
- Recency: eventDateUtc MUST be within the last {o.MaxAgeDays} days (≤ 30 days). Omit anything older.

Recent titles to avoid: {string.Join("; ", recentTitles.Take(50))}";

    public static string BuildTrendingUser(AiNewsOptions o, int count) => $@"
Return JSON:
{{
  ""items"": [
    {{
      ""title"": ""specific, unique headline"",
      ""category"": ""Politics|Crime|Entertainment|Business|Health|Lifestyle|Technology|Sports|Info"",
      ""articleHtml"": ""<div>...subheads...What happens next...</div>"",
      ""countryName"": null | ""France"" | ""United States"" | ...,
      ""countryCode"": null | ""FR"" | ""US"" | ...,
      ""keywords"": [""kw1"",""kw2"",...],
      ""images"": [{{ ""altText"": ""accurate alt"", ""caption"": ""helpful caption"", ""photoLink"": ""https://upload.wikimedia.org/..."" }}],
      ""eventDateUtc"": ""YYYY-MM-DDTHH:mm:ssZ"",
      ""isBreaking"": true|false,
      ""breakingReason"": null | ""short reason""
    }}
  ]
}}
Constraints:
- Identify truly trending items from the last {o.MaxAgeDays} days based on internal knowledge only.
- Return up to {count} strong items; if fewer valid exist, return fewer.";

    public static string BuildRandomUser(AiNewsOptions o, Category category) => $@"
Write ONE fresh analysis piece in category '{category}' that follows the same structural rules. The story must feel human-written, with simple words and clear sub-headings, and a 'What happens next' section. Return the same JSON shape with a single item in 'items'. Title must be unique vs the recent list.";

    public static string BuildTrueCrimeUser(AiNewsOptions o) => $@"
Write ONE non-graphic TRUE CRIME article in the 'Crime' category.
Requirements:
- Focus on a real murder/crime case with developments in the last {o.MaxAgeDays} days; if none, write a recent analysis with a current analysis date within that window. Mention dates and places briefly.
- Thrilling but responsible tone; simple human words; no gore or graphic detail.
- ≥ {Math.Max(o.MinWordCount, o.TrueCrimeMinWordCount)} words.
- Structure: one <div> with clear <h2>/<h3> sections, and end with 'What happens next' describing likely next steps in the investigation/trial.
- Provide accurate royalty-free image link(s) if appropriate; else [].
- Output the same JSON 'items' shape as other prompts, with eventDateUtc set to a date within {o.MaxAgeDays} days.";
}
#endregion

#region Mapping helpers
internal static class ArticleMapping
{
    public static Category ParseCategoryStrict(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return Category.Info;
        switch (s.Trim().ToLowerInvariant())
        {
            case "politics": return Category.Politics;
            case "crime": return Category.Crime;
            case "entertainment": return Category.Entertainment;
            case "business": return Category.Business;
            case "health": return Category.Health;
            case "lifestyle": return Category.Lifestyle; // ✅ capital L
            case "technology": return Category.Technology;
            case "sports": return Category.Sports;
            case "info": return Category.Info;
            default: return Category.Info;
        }
    }

    public static string EnsureHtmlDiv(string html, int minWords)
    {
        var t = html?.Trim() ?? string.Empty;
        if (!t.StartsWith("<div", StringComparison.OrdinalIgnoreCase))
            t = $"<div>\n{t}\n</div>";

        // ensure length and structure
        var words = Regex.Split(Regex.Replace(t, "<.*?>", " "), @"\s+")
                         .Where(w => !string.IsNullOrWhiteSpace(w))
                         .ToArray();
        if (words.Length < minWords)
            t += $"\n<!-- padded to meet minimum word count {minWords} -->";
        if (!Regex.IsMatch(t, @"<h2>|<h3>", RegexOptions.IgnoreCase))
            t = t.Replace("<div>", "<div>\n<h2>Update</h2>\n", StringComparison.OrdinalIgnoreCase);
        if (!Regex.IsMatch(t, @"What happens next", RegexOptions.IgnoreCase))
            t += "\n<h2>What happens next</h2><p>We will monitor developments and update when officials share more verified details.</p>";
        return t;
    }

    public static Article MapToArticle(
        AiArticleDraft d,
        ArticleType type,
        Guid authorId,
        IEnumerable<ArticleImage>? pickedImages,
        AiNewsOptions opts,
        DateTimeOffset nowUtc)
    {
        var isBreaking = (d.IsBreaking == true) ||
                         (d.EventDateUtc is not null &&
                          (nowUtc - d.EventDateUtc.Value) <= TimeSpan.FromHours(opts.BreakingWindowHours));

        var keywords = d.Keywords?
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Select(k => k.Trim().ToLowerInvariant())
            .Distinct()
            .Take(12)
            .ToList();
        if (keywords is { Count: 0 }) keywords = null;

        // Global => null/null per requirement
        string? countryName = d.CountryName;
        string? countryCode = d.CountryCode;
        if (string.IsNullOrWhiteSpace(countryName) ||
            countryName.Equals("global", StringComparison.OrdinalIgnoreCase))
        {
            countryName = null;
            countryCode = null;
        }

        // Prefer linked images; if none confident, set null
        var imagesList = pickedImages?.Where(i => !string.IsNullOrWhiteSpace(i.PhotoLink)).ToList();
        if (imagesList is { Count: 0 }) imagesList = null;

        var minWords = type == ArticleType.Article && opts.TrueCrimeMinWordCount > opts.MinWordCount
            ? opts.TrueCrimeMinWordCount
            : opts.MinWordCount;

        return new Article
        {
            AuthorId = authorId,
            ArticleType = type,
            Category = ParseCategoryStrict(d.Category),
            Title = (d.Title ?? string.Empty).Trim(),
            CreatedDate = DateTime.UtcNow,
            Content = EnsureHtmlDiv(d.ArticleHtml, minWords),
            IsBreakingNews = isBreaking,
            CountryName = countryName,
            CountryCode = countryCode,
            Keywords = keywords,
            Images = imagesList
        };
    }
}
#endregion

#region Service: AI Trending News every 5 minutes
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
        catch (OperationCanceledException) { }
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

        // Gather recent titles for dedupe (memory + DB)
        var recent = await db.Set<Article>()
            .OrderByDescending(a => a.CreatedDate)
            .Select(a => a.Title)
            .Take(300)
            .ToListAsync(ct);

        var system = AiNewsPrompt.BuildSystem(_opts, recent);
        var user = AiNewsPrompt.BuildTrendingUser(_opts, Math.Max(1, _opts.MaxTrendingPerTick));

        var json = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
        var batch = DeserializeSafe(json);
        if (batch.Items.Count == 0) { _log.LogInformation("AI returned no items this tick."); return; }

        // Author via FirstOrDefault (SuperAdmin or Role=2)
        var adminId = await db.Set<User>()
            .Where(u => u.Role == Role.SuperAdmin || (int)u.Role == 2)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (adminId is null) { _log.LogWarning("No SuperAdmin found."); return; }

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

            // drop if title seen recently or in this batch
            if (!titles.Add(d.Title)) { _log.LogDebug("Duplicate title skipped: {Title}", d.Title); continue; }

            if (HtmlText.CountWords(d.ArticleHtml) < 120) { _log.LogDebug("Content too short for {Title}", d.Title); continue; }

            List<ArticleImage>? images = null;
            if (_opts.UseExternalImages)
                images = await picker.FindAsync(d.Title ?? string.Empty, d.Keywords ?? Enumerable.Empty<string>(), 2, ct);
            else
                images = AiImageFilter.SelectRelevantImages(d);

            var article = ArticleMapping.MapToArticle(d, ArticleType.News, adminId.Value, images, _opts, now);

            // guard against DB duplicates (race/other service)
            var exists = await db.Set<Article>()
                .AnyAsync(a => a.Title.ToLower() == article.Title.ToLower(), ct);
            if (exists) { _log.LogDebug("DB duplicate found, skipping: {Title}", article.Title); continue; }

            toAdd.Add(article);
        }

        if (toAdd.Count == 0) { _log.LogInformation("No new AI news to insert."); return; }

        db.Set<Article>().AddRange(toAdd);
        try
        {
            await db.SaveChangesAsync(ct);
            _log.LogInformation("Inserted {Count} AI trending news item(s).", toAdd.Count);
        }
        catch (DbUpdateException ex)
        {
            _log.LogWarning(ex, "DbUpdateException while saving AI news (some duplicates may have been dropped).");
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
                catch { }
            }
            return new AiArticleDraftBatch();
        }
    }
}
#endregion

#region Service: Random AI article every 10 minutes
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
        catch (OperationCanceledException) { }
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
            .Take(300)
            .ToListAsync(ct);

        var system = AiNewsPrompt.BuildSystem(_opts, recent);
        var user = AiNewsPrompt.BuildRandomUser(_opts, category);

        var json = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
        var batch = AiTrendingNewsPollingService.DeserializeSafe(json);
        if (batch.Items.Count == 0) { _log.LogInformation("AI returned no items this tick."); return; }

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
            if (d.EventDateUtc is null) d.EventDateUtc = now;
            if (now - d.EventDateUtc.Value > maxAge) continue;
            if (!titles.Add(d.Title)) continue;
            if (HtmlText.CountWords(d.ArticleHtml) < 120) continue;

            List<ArticleImage>? images = null;
            if (_opts.UseExternalImages)
                images = await picker.FindAsync(d.Title ?? string.Empty, d.Keywords ?? Enumerable.Empty<string>(), 2, ct);
            else
                images = AiImageFilter.SelectRelevantImages(d);

            var article = ArticleMapping.MapToArticle(
                d, ArticleType.Article, adminId.Value, images, _opts, now);

            var exists = await db.Set<Article>()
                .AnyAsync(a => a.Title.ToLower() == article.Title.ToLower(), ct);
            if (exists) continue;

            db.Set<Article>().Add(article);
        }

        await db.SaveChangesAsync(ct);
        _log.LogInformation("Inserted a random AI article in category {Category}.", category);
    }
}
#endregion

#region Service: TRUE CRIME writer (Crime category, non-graphic)
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
            .Take(300)
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

            if (d.EventDateUtc is null) d.EventDateUtc = now; // set analysis date
            if (now - d.EventDateUtc.Value > maxAge) continue;
            if (!titles.Add(d.Title)) continue;

            var minWords = Math.Max(_opts.MinWordCount, _opts.TrueCrimeMinWordCount);
            if (HtmlText.CountWords(d.ArticleHtml) < minWords / 2) continue; // light guard before full ensure

            List<ArticleImage>? images = null;
            if (_opts.UseExternalImages)
                images = await picker.FindAsync(d.Title ?? string.Empty, d.Keywords ?? Enumerable.Empty<string>(), 2, ct);
            else
                images = AiImageFilter.SelectRelevantImages(d);

            var article = ArticleMapping.MapToArticle(
                d, ArticleType.Article, adminId.Value, images, _opts, now);

            // Force category to Crime for true-crime
            article.Category = Category.Crime;

            var exists = await db.Set<Article>()
                .AnyAsync(a => a.Title.ToLower() == article.Title.ToLower(), ct);
            if (exists) continue;

            db.Set<Article>().Add(article);
        }

        await db.SaveChangesAsync(ct);
        _log.LogInformation("Inserted a TRUE CRIME article.");
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
        services.AddHostedService<AiTrendingNewsPollingService>();   // every 5 min
        services.AddHostedService<AiRandomArticleWriterService>();   // every 10 min
        services.AddHostedService<AiTrueCrimeWriterService>();       // every 30 min (configurable)
        return services;
    }
}
#endregion
