using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Services;

#region Options
public sealed class AiNewsOptions
{
    /// <summary>API key for Gemini (Google AI Studio / Vertex AI Developer API).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Model name. Use the latest stable Gemini 2.5 Pro.</summary>
    public string Model { get; set; } = "gemini-2.5-pro";

    /// <summary>How often to poll and publish AI-generated trending news.</summary>
    public TimeSpan TrendingInterval { get; set; } = TimeSpan.FromMinutes(1);

    /// <summary>How often to write a random category article.</summary>
    public TimeSpan RandomInterval { get; set; } = TimeSpan.FromMinutes(1);

    /// <summary>Max items to attempt per trending tick.</summary>
    public int MaxTrendingPerTick { get; set; } = 3;

    /// <summary>Temperature-style creativity control (0..2); 0.7–1.0 reads more human.</summary>
    public double Creativity { get; set; } = 0.9;

    /// <summary>Minimum words for the article body.</summary>
    public int MinWordCount { get; set; } = 260;
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
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
        var uri = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

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
                role = "system",
                parts = new object[] { new { text = systemInstruction } }
            },
            generationConfig = new
            {
                temperature,
                candidateCount = 1,
                stopSequences = Array.Empty<string>(),
                responseMimeType = "application/json"
            }
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
            string reason = body;
            try
            {
                using var errDoc = JsonDocument.Parse(body);
                if (errDoc.RootElement.TryGetProperty("error", out var err))
                {
                    var code = err.TryGetProperty("code", out var c) ? c.GetRawText() : "?";
                    var msg = err.TryGetProperty("message", out var m) ? m.GetString() : "?";
                    reason = $"code={code}, message={msg}";
                }
            }
            catch { }

            _log.LogError("Gemini call failed: {Status}. Reason: {Reason}", (int)res.StatusCode, reason);
            res.EnsureSuccessStatusCode();
        }

        using var doc = JsonDocument.Parse(body);
        // pull first candidate text
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        if (string.IsNullOrWhiteSpace(text))
        {
            _log.LogWarning("Gemini returned empty text");
            return "{}";
        }
        return text!;
    }
}
#endregion

#region Prompt builder
public static class AiNewsPrompt
{
    public static string BuildSystem(AiNewsOptions o, IEnumerable<string> recentTitles) => $@"You are a senior news editor. Write like a human journalist. Never mention you are an AI.
Tone: clear, calm, concise. No fluff, no cliches, no self-references.
Rules:
- Only output strict JSON (UTF-8) and nothing else.
- Each article body must be a single <div> with semantic sub-headings (<h2>/<h3>), short paragraphs, and a final section called 'What happens next'.
- Minimum {o.MinWordCount} words per article body.
- Paraphrase ideas; avoid generic phrasing and avoid plagiarism.
- Include 3–6 royalty-free image links (Unsplash, Pexels, Pixabay, Wikimedia Commons, etc.) with good alt text and short captions.
- Prefer links (do not embed data URLs). No copyrighted or watermarked sources.
- Use simple words but professional style. Make it feel human-written.
- No sources, no URLs other than image links. No disclaimers.
- If the scope is global, set countryName = null and countryCode = null.
- Use 5–12 relevant SEO keywords.
- Do not repeat topics. Here are recent titles to avoid (case-insensitive):\n{string.Join("; ", recentTitles.Take(50))}";

    public static string BuildTrendingUser(AiNewsOptions o, int count) => $@"Find the top {count} trending topics right now. Cover diverse categories if possible.
Return JSON with this exact shape:
{{
  ""items"": [
    {{
      ""title"": ""...unique headline..."",
      ""category"": ""Politics|Crime|Entertainment|Business|Health|Lifestyle|Technology|Sports|Info"",
      ""articleHtml"": ""<div>...sub-headings...</div>"",
      ""countryName"": null | ""France"" | ""United States"" | ...,
      ""countryCode"": null | ""FR"" | ""US"" | ...,
      ""keywords"": [""kw1"", ""kw2"", ...],
      ""images"": [
         {{ ""photoLink"": ""https://..."", ""altText"": ""..."", ""caption"": ""..."" }}
      ]
    }}
  ]
}}
Constraints: No duplicate titles. Titles must be fresh and specific.";

    public static string BuildRandomUser(AiNewsOptions o, Category category) => $@"Write one fresh piece in category '{category}'. It may be newsy or analysis.
Return the same JSON shape as above with a single item in 'items'. Titles must be unique vs recent list.";
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
            _log.LogWarning("AI returned no items.");
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

        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title) || string.IsNullOrWhiteSpace(d.ArticleHtml)) continue;
            if (!titles.Add(d.Title)) { _log.LogDebug("Duplicate title skipped: {Title}", d.Title); continue; }

            var category = ParseCategory(d.Category);

            var article = new Article
            {
                AuthorId = adminId.Value,
                ArticleType = ArticleType.News,
                Category = category,
                Title = d.Title.Trim(),
                Content = EnsureHtmlDiv(d.ArticleHtml, _opts.MinWordCount),
                IsBreakingNews = false,
                CountryName = d.CountryName, // null for global
                CountryCode = d.CountryCode, // null for global
                Keywords = d.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>(),
                Images = d.Images?.Where(i => !string.IsNullOrWhiteSpace(i.PhotoLink)).Select(i => new ArticleImage
                {
                    PhotoLink = i.PhotoLink,
                    AltText = i.AltText,
                    Caption = i.Caption
                }).ToList() ?? new List<ArticleImage>()
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
        if (batch.Items.Count == 0) return;

        var adminId = await db.Set<User>()
            .Where(u => u.Role == Role.SuperAdmin || (int)u.Role == 2)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (adminId is null) { _log.LogWarning("No SuperAdmin found."); return; }

        var titles = new HashSet<string>(recent, StringComparer.OrdinalIgnoreCase);
        foreach (var d in batch.Items)
        {
            if (string.IsNullOrWhiteSpace(d.Title) || !titles.Add(d.Title)) continue;

            var article = new Article
            {
                AuthorId = adminId.Value,
                ArticleType = ArticleType.Article,
                Category = ParseCategory(d.Category),
                Title = d.Title.Trim(),
                Content = EnsureHtmlDiv(d.ArticleHtml, _opts.MinWordCount),
                IsBreakingNews = false,
                CountryName = d.CountryName,
                CountryCode = d.CountryCode,
                Keywords = d.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new List<string>(),
                Images = d.Images?.Where(i => !string.IsNullOrWhiteSpace(i.PhotoLink)).Select(i => new ArticleImage
                {
                    PhotoLink = i.PhotoLink,
                    AltText = i.AltText,
                    Caption = i.Caption
                }).ToList() ?? new List<ArticleImage>()
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
        services.AddHostedService<AiTrendingNewsPollingService>();
        services.AddHostedService<AiRandomArticleWriterService>();
        return services;
    }
}
#endregion
