using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Utilities;
using Polly.Timeout;                      // ✅ Polly timeout type
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;                    // SemaphoreSlim + Timeout.InfiniteTimeSpan
using System.Threading.RateLimiting;       // fixed-window limiter

namespace Northeast.Services;

#region Options
public sealed class AiNewsOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-2.5-flash";

    public TimeSpan TrendingInterval { get; set; } = TimeSpan.FromMinutes(15);
    public TimeSpan RandomInterval { get; set; } = TimeSpan.FromMinutes(15);
    public TimeSpan TrueCrimeInterval { get; set; } = TimeSpan.FromMinutes(30);

    public int MaxTrendingPerTick { get; set; } = 3;
    public double Creativity { get; set; } = 0.9;
    public int MinWordCount { get; set; } = 150;
    public int PreInsertMinWordCount { get; set; } = 80;      // low bar before mapping/padding
    public bool FillMissingHtml { get; set; } = true;          // auto-build HTML if AI omits it
    public bool AcceptStaleAsAnalysis { get; set; } = true;    // coerce stale items into analysis
    public int MaxAgeHours { get; set; } = 24;
    public int MaxAgeDays { get; set; } = 3;
    public int BreakingWindowHours { get; set; } = 24;
    public bool UseExternalImages { get; set; } = false;
    public int TrueCrimeMinWordCount { get; set; } = 250;
    public bool UseExternalNews { get; set; } = false; // back-compat
}
#endregion

#region Cross-service single-flight gate
/// <summary>Ensures only one AI job runs at a time across all hosted services.</summary>
public sealed class AiWorkGate
{
    private static readonly SemaphoreSlim _sem = new(1, 1);
    public static async Task<IDisposable> EnterAsync()
    {
        await _sem.WaitAsync();
        return new Releaser(_sem);
    }
    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _s;
        public Releaser(SemaphoreSlim s) => _s = s;
        public void Dispose() => _s.Release();
    }
}
#endregion

#region Image filtering helper
internal static class AiImageFilter
{
    public static List<ArticleImage>? SelectRelevantImages(AiArticleDraft draft)
    {
        if (draft.Images is null || draft.Images.Count == 0) return null;

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
            .Reverse()
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

#region DTOs for AI JSON
public sealed class AiArticleDraft
{
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("category")] public string Category { get; set; } = "Info";
    [JsonPropertyName("articleHtml")] public string ArticleHtml { get; set; } = string.Empty;
    [JsonPropertyName("countryName")] public string? CountryName { get; set; }
    [JsonPropertyName("countryCode")] public string? CountryCode { get; set; }
    [JsonPropertyName("keywords")] public List<string>? Keywords { get; set; }
    [JsonPropertyName("images")] public List<AiImage>? Images { get; set; }
    [JsonPropertyName("eventDateUtc")] public DateTimeOffset? EventDateUtc { get; set; }
    [JsonPropertyName("isBreaking")] public bool? IsBreaking { get; set; }
 
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

#region Gemini REST client (queued limiter + 31s spacing)
public interface IGenerativeTextClient
{
    Task<string> GenerateJsonAsync(string model, string systemInstruction, string userPrompt, double temperature, CancellationToken ct);
}

public sealed class GeminiRestClient : IGenerativeTextClient
{
    private readonly HttpClient _http;
    private readonly ILogger<GeminiRestClient> _log;
    private readonly AiNewsOptions _opts;

    // Enforce ~2 req/min globally — queue instead of fail.
    private static readonly FixedWindowRateLimiter _limiter = new(
        new FixedWindowRateLimiterOptions
        {
            PermitLimit = 2,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 6,
            AutoReplenishment = true
        });

    // Extra safety: ensure >= 31s between sends across process
    private static readonly SemaphoreSlim _slotLock = new(1, 1);
    private static DateTimeOffset _nextSlotUtc = DateTimeOffset.MinValue;
    private static readonly TimeSpan _minSpacing = TimeSpan.FromSeconds(31);

    public GeminiRestClient(HttpClient http, IOptions<AiNewsOptions> opts, ILogger<GeminiRestClient> log)
    {
        _http = http; _log = log; _opts = opts.Value;
    }

    public async Task<string> GenerateJsonAsync(string model, string systemInstruction, string userPrompt, double temperature, CancellationToken ct)
    {
        // Strategy 1: JSON mode
        var (ok1, body1) = await CallAsync(model, systemInstruction, userPrompt, temperature, jsonMode: true, ct);
        var text = ok1 ? Extract(body1!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        // Strategy 2: Plain text, but force JSON in prompt
        var forced = userPrompt + "\n\nReturn ONLY valid JSON for the described schema in the 'items' array. No prose outside JSON.";
        var (ok2, body2) = await CallAsync(model, systemInstruction, forced, temperature, jsonMode: false, ct);
        text = ok2 ? Extract(body2!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        // Strategy 3: flash JSON mode
        var (ok3, body3) = await CallAsync("gemini-2.5-flash", systemInstruction, userPrompt, temperature, jsonMode: true, ct);
        text = ok3 ? Extract(body3!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}") return text!;

        _log.LogWarning("Gemini returned no usable JSON after all strategies.");
        return "{}";
    }

    private async Task<(bool ok, string? body)> CallAsync(
        string model, string sys, string prompt, double temperature,
        bool jsonMode, CancellationToken ct)
    {
        var gen = new Dictionary<string, object?>
        {
            ["temperature"] = temperature,
            ["candidateCount"] = 1,
            ["maxOutputTokens"] = 8192
        };
        if (jsonMode) gen["responseMimeType"] = "application/json";

        var payload = new
        {
            contents = new[] { new { role = "user", parts = new object[] { new { text = prompt } } } },
            systemInstruction = new { role = "system", parts = new object[] { new { text = sys } } },
            generationConfig = gen
        };

        var uri = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_opts.ApiKey}";
        var json = JsonSerializer.Serialize(payload);

        // Slot spacing to keep under 2 RPM
        await _slotLock.WaitAsync(ct);
        try
        {
            var now = DateTimeOffset.UtcNow;
            if (_nextSlotUtc > now)
            {
                var wait = _nextSlotUtc - now;
                _log.LogInformation("Gemini: waiting {ms} ms to respect spacing", (int)wait.TotalMilliseconds);
                await Task.Delay(wait, ct);
            }
        }
        finally
        {
            _slotLock.Release();
        }

        var attempt = 0;
        var maxAttempts = 3;
        var rnd = new Random();

        while (true)
        {
            attempt++;

            using var lease = await _limiter.AcquireAsync(1, ct);
            if (!lease.IsAcquired)
                throw new Exception("Local Gemini rate limit exceeded (queue full)");

            using var req = new HttpRequestMessage(HttpMethod.Post, uri)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            req.Headers.TryAddWithoutValidation("x-goog-api-key", _opts.ApiKey);

            var start = DateTimeOffset.UtcNow;
            using var res = await _http.SendAsync(req, ct);
            var took = DateTimeOffset.UtcNow - start;
            var body = await res.Content.ReadAsStringAsync(ct);

            if (res.IsSuccessStatusCode)
            {
                _log.LogInformation("Gemini {Model} 200 OK in {Ms} ms", model, (int)took.TotalMilliseconds);

                await _slotLock.WaitAsync(ct);
                try { _nextSlotUtc = DateTimeOffset.UtcNow + _minSpacing; }
                finally { _slotLock.Release(); }

                return (true, body);
            }

            var code = (int)res.StatusCode;
            if ((code == 429 || code >= 500) && attempt < maxAttempts)
            {
                var delay = res.Headers.RetryAfter?.Delta ??
                            TimeSpan.FromMilliseconds(300 * Math.Pow(2, attempt) + rnd.Next(0, 200));
                _log.LogWarning("Gemini HTTP {Status}. Retrying in {Delay}ms (attempt {Attempt}/{Max}). Body: {Body}",
                    code, (int)delay.TotalMilliseconds, attempt, maxAttempts, Trunc(body, 600));
                await Task.Delay(delay, ct);
                continue;
            }

            _log.LogWarning("Gemini HTTP {Status}. Body: {Body}", code, Trunc(body, 800));
            return (false, body);
        }

        static string Trunc(string s, int max) => s.Length <= max ? s : s[..max] + "…";
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
- Each item: ≥ {o.MinWordCount} words, one <div> root, use <h2>/<h3> sub-headings, END with sub heading 'What happens next'.
- Sound human (no AI clichés). Paraphrase; do not copy lines verbatim.
- If global, set ""countryName"": null and ""countryCode"": null.
- Provide 5–12 lowercase, unique keywords.
- DO NOT repeat topics already covered recently.
- Recency: eventDateUtc MUST be within the last {o.MaxAgeHours} hours (≤ 30 hours).

Recent titles to avoid: {string.Join("; ", recentTitles.Take(50))}";

    public static string BuildTrendingUser(AiNewsOptions o, int count) => $@"
Return JSON:
{{
  ""items"": [
    {{
      ""title"": ""specific, unique headline"",
      ""category"": ""Politics|Crime|Entertainment|Business|Health|Lifestyle|Technology|Sports|Info"",
      ""articleHtml"": ""<div>...subheads...summary...</div>"",
      ""countryName"": null | ""France"" | ""United States"" | ...,
      ""countryCode"": null | ""FR"" | ""US"" | ...,
      ""keywords"": [""kw1"",""kw2"",...],
      ""images"": [],
      ""eventDateUtc"": ""YYYY-MM-DDTHH:mm:ssZ"",
      ""isBreaking"": true|false
    }}
  ]
}}
Constraints:
- PRIORITIZE stories from the LAST 60 MINUTES.
- If not enough last-hour stories exist, you MAY include items (up to {o.MaxAgeDays} days old) for NON-POLITICS categories, but label them as context/non-breaking.
- DO NOT include items older than 60 minutes for the Politics category.
- Return up to {count} items (include fewer if necessary).
- Add depth to article
- If necessary add stats or available datas in the article. 
- If details are thin, write a 'what we know so far' with verified context to reach ≥ {o.MinWordCount} words.";

    public static string BuildRandomUser(AiNewsOptions o, Category category) => $@"
Write ONE fresh analysis piece in category '{category}' that follows the same structural rules. Return the same JSON shape with a single item in 'items'. Title must be unique vs the recent list.";

    public static string BuildTrueCrimeUser(AiNewsOptions o) => $@"
Write ONE non-graphic TRUE CRIME article in the 'Crime' category.
Requirements:
- Focus on a real murder/crime cases , recent or historic;.
- ≥ {Math.Max(o.MinWordCount, o.TrueCrimeMinWordCount)} words, make it thriller and without palgiarism and properly worded, in depth stories.
- Structure: one <div> with clear <h2> sections, and end with 'What happened next' if there is proper else give concludion or warning for people to take care against similar incident .
- Output the same JSON 'items' shape as other prompts with some crrections for trum crime part no what happen next but 'what happened next 'like public reactions, outcomes,etc";
}
#endregion

#region Mapping helpers
internal static class ArticleMapping
{
    public static Category ParseCategoryStrict(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return Category.Info;
        return s.Trim().ToLowerInvariant() switch
        {
            "politics" => Category.Politics,
            "crime" => Category.Crime,
            "entertainment" => Category.Entertainment,
            "business" => Category.Business,
            "health" => Category.Health,
            "lifestyle" => Category.Lifestyle,
            "technology" => Category.Technology,
            "sports" => Category.Sports,
            "info" => Category.Info,
            _ => Category.Info
        };
    }

    public static string EnsureHtmlDiv(string html, int minWords)
    {
        var t = html?.Trim() ?? string.Empty;
        if (!t.StartsWith("<div", StringComparison.OrdinalIgnoreCase))
            t = $"<div>\n{t}\n</div>";

        var words = Regex.Split(Regex.Replace(t, "<.*?>", " "), @"\s+")
                         .Where(w => !string.IsNullOrWhiteSpace(w)).ToArray();
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

        string? countryName = d.CountryName;
        string? countryCode = d.CountryCode;
        if (string.IsNullOrWhiteSpace(countryName) ||
            countryName.Equals("global", StringComparison.OrdinalIgnoreCase))
        {
            countryName = null;
            countryCode = null;
        }

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

    public static ArticleDto MapToDto(Article article)
    {
        return new ArticleDto
        {
            Title = article.Title,
            Category = article.Category,
            ArticleType = article.ArticleType,
            Content = article.Content,
            IsBreakingNews = article.IsBreakingNews,
            Images = article.Images?.Select(i => new ArticleImageDto
            {
                Photo = i.Photo,
                PhotoLink = i.PhotoLink,
                AltText = i.AltText,
                Caption = i.Caption
            }).ToList(),
            CountryName = article.CountryName,
            CountryCode = article.CountryCode,
            Keyword = article.Keywords
        };
    }
}
#endregion

#region Service: AI Trending News
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
        await Task.Delay(TimeSpan.Zero, stoppingToken); // 0s for Trending

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
        using var gate = await AiWorkGate.EnterAsync();

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

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

        var admin = await db.Users
            .FirstOrDefaultAsync(u => u.Role == Role.SuperAdmin || u.Role == Role.Admin, ct);
        if (admin is null) { _log.LogWarning("No Admin or SuperAdmin found."); return; }
        var adminId = admin.Id;

        var now = DateTimeOffset.UtcNow;
        var lastHour = TimeSpan.FromHours(1);
        var maxAge = TimeSpan.FromDays(_opts.MaxAgeDays);

        var toAdd = new List<Article>();
        foreach (var d0 in batch.Items)
        {
            var d = d0;

            if (string.IsNullOrWhiteSpace(d.Title))
            { Info("missing title", d); continue; }

            if (d.EventDateUtc is null) d.EventDateUtc = now;

            var age = now - d.EventDateUtc.Value;
            var cat = ArticleMapping.ParseCategoryStrict(d.Category);
            var acceptingStale = false;

            // Fresh vs stale logic
            if (age > lastHour)
            {
                if (cat == Category.Politics)
                {
                    Info($"politics item older than last hour ({(int)age.TotalMinutes} min)", d);
                    continue;
                }

                // Accept stale (non-Politics) as analysis, within MaxAgeDays
                if (age <= maxAge)
                {
                    acceptingStale = true;
                    d.IsBreaking = false;
                    // Normalize to 'now' so it doesn't look outdated in feeds
                    d.EventDateUtc = now;
                }
                else
                {
                    Info("too old (beyond MaxAgeDays)", d);
                    continue;
                }
            }

            // Ensure HTML exists
            if (string.IsNullOrWhiteSpace(d.ArticleHtml) && _opts.FillMissingHtml)
                d.ArticleHtml = AiFallbacks.MakeArticleHtml(d, _opts.MinWordCount, now, editorsNote: acceptingStale);

            // Try to expand to >= MinWordCount if short
            if (HtmlText.CountWords(d.ArticleHtml) < _opts.MinWordCount)
            {
                var expanded = await AiElaboration.ExpandToMinWordsAsync(_ai, _opts, d, recent, now, ct);
                if (HtmlText.CountWords(expanded.ArticleHtml) >= _opts.MinWordCount)
                    d = expanded;
            }

            // Hard fallback: enforce minimum length
            if (HtmlText.CountWords(d.ArticleHtml) < _opts.MinWordCount)
            {
                d.ArticleHtml = AiFallbacks.MakeArticleHtml(d, _opts.MinWordCount, now, editorsNote: acceptingStale);
            }

            List<ArticleImage>? images = null; // images intentionally omitted
            var articleType = acceptingStale ? ArticleType.Article : ArticleType.News;

            var article = ArticleMapping.MapToArticle(d, articleType, adminId, images, _opts, now);

            // Duplicate handling: uniquify instead of drop
            var exists = await db.Set<Article>()
                .AnyAsync(a => a.Title.ToLower() == article.Title.ToLower(), ct);
            if (exists)
            {
                var fallbackTitle = $"{article.Title} — update {now:HH:mm}";
                var exists2 = await db.Set<Article>()
                    .AnyAsync(a => a.Title.ToLower() == fallbackTitle.ToLower(), ct);

                if (!exists2)
                {
                    article.Title = fallbackTitle;
                }
                else
                {
                    Info("DB duplicate title (even with update suffix)", d);
                    continue;
                }
            }

            toAdd.Add(article);
        }

        if (toAdd.Count == 0) { _log.LogInformation("No new AI last-hour or accepted-stale news to insert."); return; }

        var articleService = scope.ServiceProvider.GetRequiredService<ArticleServices>();
        try
        {
            foreach (var article in toAdd)
                await articleService.Publish(ArticleMapping.MapToDto(article), adminId);

            _log.LogInformation("Inserted {Count} AI trending item(s) (fresh + accepted stale).", toAdd.Count);
        }
        catch (DbUpdateException ex)
        {
            _log.LogError(ex, "Failed to insert AI trending item(s); no articles were saved.");
        }
    }

    private void Info(string reason, AiArticleDraft d) =>
        _log.LogInformation("drop: {Reason} | title='{Title}'", reason, d.Title);

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

#region Service: Random AI article
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
        await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken); // stagger

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
        using var gate = await AiWorkGate.EnterAsync();

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

        var admin = await db.Users
            .FirstOrDefaultAsync(u => u.Role == Role.SuperAdmin || u.Role == Role.Admin, ct);
        if (admin is null) { _log.LogWarning("No Admin or SuperAdmin found."); return; }
        var adminId = admin.Id;

        var now = DateTimeOffset.UtcNow;
        var maxAge = TimeSpan.FromHours(_opts.MaxAgeHours);

        var toAdd = new List<Article>();
        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title))
                { Info("missing title", d); continue; }
            if (string.IsNullOrWhiteSpace(d.ArticleHtml) && _opts.FillMissingHtml)
                d.ArticleHtml = AiFallbacks.MakeArticleHtml(d, _opts.MinWordCount, now);
            if (d.EventDateUtc is null) d.EventDateUtc = now;
            if (now - d.EventDateUtc.Value > maxAge)
                { Info("too old", d); continue; }
            if (HtmlText.CountWords(d.ArticleHtml) < _opts.PreInsertMinWordCount)
                { Info($"too short (<{_opts.PreInsertMinWordCount} words)", d); continue; }

            List<ArticleImage>? images = null; // images are intentionally omitted

            var article = ArticleMapping.MapToArticle(
                d, ArticleType.Article, adminId, images, _opts, now);

            var exists = await db.Set<Article>()
                .AnyAsync(a => a.Title.ToLower() == article.Title.ToLower(), ct);
            if (exists)
            {
                Info("DB duplicate title", d);
                continue;
            }

            toAdd.Add(article);
        }

        if (toAdd.Count == 0)
        {
            _log.LogInformation("No random AI article inserted for category {Category}.", category);
            return;
        }

        var articleService = scope.ServiceProvider.GetRequiredService<ArticleServices>();
        try
        {
            foreach (var article in toAdd)
                await articleService.Publish(ArticleMapping.MapToDto(article), adminId);

            _log.LogInformation("Inserted {Count} random AI article(s) in category {Category}.", toAdd.Count, category);
        }
        catch (DbUpdateException ex)
        {
            _log.LogError(ex, "Failed to insert random AI article(s) in category {Category}.", category);
        }
    }

    private void Info(string reason, AiArticleDraft d) =>
        _log.LogInformation("drop: {Reason} | title='{Title}'", reason, d.Title);
}
#endregion

#region Service: TRUE CRIME writer
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
        await Task.Delay(TimeSpan.FromSeconds(40), stoppingToken); // stagger

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
        using var gate = await AiWorkGate.EnterAsync();

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

        var admin = await db.Users
            .FirstOrDefaultAsync(u => u.Role == Role.SuperAdmin || u.Role == Role.Admin, ct);
        if (admin is null) { _log.LogWarning("No Admin or SuperAdmin found."); return; }
        var adminId = admin.Id;

        var now = DateTimeOffset.UtcNow;
        var maxAge = TimeSpan.FromHours(_opts.MaxAgeHours);

        var articleService = scope.ServiceProvider.GetRequiredService<ArticleServices>();
        var inserted = 0;
        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title) || string.IsNullOrWhiteSpace(d.ArticleHtml))
                { Info("missing title or html", d); continue; }

            if (d.EventDateUtc is null) d.EventDateUtc = now;
            if (now - d.EventDateUtc.Value > maxAge)
                { Info("too old", d); continue; }

            if (HtmlText.CountWords(d.ArticleHtml) < _opts.PreInsertMinWordCount)
                { Info($"too short (<{_opts.PreInsertMinWordCount} words)", d); continue; }

            List<ArticleImage>? images = null; // images are intentionally omitted

            var article = ArticleMapping.MapToArticle(
                d, ArticleType.Article, adminId, images, _opts, now);

            article.Category = Category.Crime;

            var exists = await db.Set<Article>()
                .AnyAsync(a => a.Title.ToLower() == article.Title.ToLower(), ct);
            if (exists)
            {
                Info("DB duplicate title", d);
                continue;
            }

            try
            {
                await articleService.Publish(ArticleMapping.MapToDto(article), adminId);
                inserted++;
            }
            catch (DbUpdateException ex)
            {
                _log.LogError(ex, "Failed to insert AI true-crime article '{Title}'.", article.Title);
            }
        }

        if (inserted == 0)
            _log.LogInformation("No TRUE CRIME article inserted.");
        else
            _log.LogInformation("Inserted {Count} TRUE CRIME article(s).", inserted);
    }

    private void Info(string reason, AiArticleDraft d) =>
        _log.LogInformation("drop: {Reason} | title='{Title}'", reason, d.Title);
}
#endregion

#region DI registration helper
public static class AiNewsRegistration
{
    public static IServiceCollection AddAiNews(this IServiceCollection services, Action<AiNewsOptions> configure)
    {
        services.Configure(configure);

        // Gemini client with Polly owning timeouts (no double timeout)
        services.AddHttpClient<IGenerativeTextClient, GeminiRestClient>(client =>
        {
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            client.Timeout = Timeout.InfiniteTimeSpan;                 // ✅ let Polly handle timeouts
        })
        .AddStandardResilienceHandler(o =>
        {
            // --- Timeouts ---
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(120);       // per-try
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(150); // whole pipeline

            // --- Circuit breaker (must satisfy SamplingDuration >= 2 * AttemptTimeout) ---
            o.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(2);  // ✅ >= 120s
            o.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(60);
            o.CircuitBreaker.FailureRatio = 0.2;
            o.CircuitBreaker.MinimumThroughput = 10;

            // --- Retry (treat Polly timeouts as transient) ---
            o.Retry.MaxRetryAttempts = 3;
            o.Retry.ShouldHandle = args =>
                new ValueTask<bool>(
                    args.Outcome.Exception is HttpRequestException
                    || args.Outcome.Exception is TimeoutRejectedException
                    || (args.Outcome.Result is { } r &&
                        (r.StatusCode == HttpStatusCode.RequestTimeout || (int)r.StatusCode >= 500))
                );
        });


        // Hosted services
        services.AddHostedService<AiTrendingNewsPollingService>();
        services.AddHostedService<AiRandomArticleWriterService>();
        services.AddHostedService<AiTrueCrimeWriterService>();
        return services;
    }
}
#endregion
