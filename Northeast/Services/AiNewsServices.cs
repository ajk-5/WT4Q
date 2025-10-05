using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Polly.Timeout;                      // ✅ Polly timeout type
using System.Collections.Generic;
using System.Globalization;
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
using System.Xml.Linq;

namespace Northeast.Services;

#region Options
/// <summary>
/// Options for Google News RSS powered pipeline. This replaces the purely-AI writers.
/// - CategoryRotationInterval: fetch a category feed every 10 minutes (default)
/// - TopStoriesInterval: fetch global "Top stories" every 30 minutes
/// - LocalTopStoriesInterval: pick a random country from Data/Countries.json and fetch its Top stories every 15 minutes
/// Other options (MinWordCount, etc.) are reused.
/// </summary>
public sealed class AiNewsOptions
{
    public string ApiKey { get; set; } = string.Empty;                 // Gemini key for paraphrasing/expansion
    public string Model { get; set; } = "gemini-2.5-flash-latest";

    // NEW intervals for RSS-based writers
    public TimeSpan CategoryRotationInterval { get; set; } = TimeSpan.FromMinutes(10);
    public TimeSpan TopStoriesInterval { get; set; } = TimeSpan.FromMinutes(30);
    public TimeSpan LocalTopStoriesInterval { get; set; } = TimeSpan.FromMinutes(15);

    // Output & behavior
    public double Creativity { get; set; } = 0.9;
    public int MinWordCount { get; set; } = 350;       // long-form baseline
    public int PreInsertMinWordCount { get; set; } = 175;
    public bool FillMissingHtml { get; set; } = true;          // auto-build HTML if AI omits it
    public int BreakingWindowHours { get; set; } = 24;         // what counts as breaking

    // Locale defaults for Google News (used when not selecting a specific country)
    public string DefaultLang { get; set; } = "en";           // UI language, e.g., fr, en-US
    public string DefaultCountry { get; set; } = "US";        // Edition country code, e.g., FR, US

    // Images (kept off by default)
    public bool UseExternalImages { get; set; } = false;

    // Output/token controls
    public int MaxOutputTokensHardCap { get; set; } = 1600;  // ≈ 900–1,100 words
    public int OutputTokensPerWord { get; set; } = 14;       // ≈1.4 tokens/word ×10 (fixed-point)

    // Backoff pacing (raise if quota tight)
    public int MinSpacingSeconds { get; set; } = 5;
    public int MaxSpacingSeconds { get; set; } = 10;
}
#endregion

#region Cross-service single-flight gate
/// <summary>Ensures only one job runs at a time across all hosted services.</summary>
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

#region DTOs (shared)
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

#region Minimal HTML/Text helpers (self-contained)
internal static class HtmlText
{
    public static int CountWords(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return 0;
        var text = Regex.Replace(html, "<[^>]+>", " ");
        return Regex.Matches(text, @"\b\w+\b").Count;
    }

    public static string AppendSourcesIfMissing(string html, string link, string? publisher)
    {
        if (string.IsNullOrWhiteSpace(html) || string.IsNullOrWhiteSpace(link)) return html;
        try
        {
            if (Regex.IsMatch(html, @"<(h2|h3)[^>]*>\s*(Sources|Citations|References)\s*<", RegexOptions.IgnoreCase))
                return html;

            string display = publisher;
            if (string.IsNullOrWhiteSpace(display) && Uri.TryCreate(link, UriKind.Absolute, out var uri))
                display = uri.Host;
            display ??= "Source";

            var snippet = $"\n<h2>Sources</h2>\n<ul>\n<li><a href=\"{WebUtility.HtmlEncode(link)}\" target=\"_blank\" rel=\"noopener nofollow\">{WebUtility.HtmlEncode(display)}</a></li>\n</ul>";

            if (Regex.IsMatch(html, "</div>\\s*$", RegexOptions.IgnoreCase))
                return Regex.Replace(html, "</div>\\s*$", snippet + "\n</div>", RegexOptions.IgnoreCase);

            return html + snippet;
        }
        catch { return html; }
    }
    public static string EnsureHtmlDivWithStructure(string html, int minWords)
    {
        var t = html?.Trim() ?? string.Empty;
        if (!t.StartsWith("<div", StringComparison.OrdinalIgnoreCase))
            t = $"<div>\n{t}\n</div>";

        // Ensure some h2/h3 structure and paragraphization
        if (!Regex.IsMatch(t, @"<h2>|<h3>", RegexOptions.IgnoreCase))
            t = t.Replace("<div>", "<div>\n<h2>Key points</h2>", StringComparison.OrdinalIgnoreCase);

        // Split long text blocks into paragraphs for readability
        t = Paragraphize(t);

        // Do not inject a generic conclusion; leave conclusion style to the writer/prompt

        // pad if very short
        if (CountWords(t) < minWords)
            t += $"\n<!-- padded to reach ≥{minWords} words -->";

        return t;
    }

    public static string DeGenericizeConclusions(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return html;
        try
        {
            var variants = new[] { "Key takeaway", "Outlook", "The bottom line", "What to watch", "Where it stands" };
            var idx = Math.Abs(html.GetHashCode()) % variants.Length;
            var replacement = WebUtility.HtmlEncode(variants[idx]);

            var rx = new Regex(@"<h(?<lvl>[23])(?<attrs>[^>]*)>\s*(what\s*(’|')?s\s*next|what happens next|why does this matter\??)\s*</h\k<lvl>>", RegexOptions.IgnoreCase);
            return rx.Replace(html, m => $"<h{m.Groups["lvl"].Value}{m.Groups["attrs"].Value}>{replacement}</h{m.Groups["lvl"].Value}>");
        }
        catch { return html; }
    }
    private static string Paragraphize(string html)
    {
        // Add <p> around loose text lines (simple heuristic)
        var inner = Regex.Replace(html, @"<div>([\s\S]*?)</div>", m =>
        {
            var body = m.Groups[1].Value;
            // Already has <p>? keep. Otherwise wrap plain lines into <p>.
            if (!body.Contains("<p>"))
            {
                var chunks = Regex.Split(body, @"\r\n|\r|\n").Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
                if (chunks.Length > 0)
                    body = string.Join("\n", chunks.Select(c => c.Trim().StartsWith("<") ? c : $"<p>{WebUtility.HtmlEncode(c.Trim())}</p>"));
            }
            return $"<div>\n{body}\n</div>";
        }, RegexOptions.IgnoreCase);
        return inner;
    }
}
#endregion

#region Link canonicalization
internal static class LinkCanon
{
    public static Uri? TryExtractPublisherUri(string link)
    {
        if (!Uri.TryCreate(link, UriKind.Absolute, out var u)) return null;

        if (!u.Host.Contains("news.google.com", StringComparison.OrdinalIgnoreCase))
            return u;

        var q = System.Web.HttpUtility.ParseQueryString(u.Query);
        var raw = q.Get("url");
        if (!string.IsNullOrWhiteSpace(raw) && Uri.TryCreate(WebUtility.UrlDecode(raw), UriKind.Absolute, out var inner))
            return inner;

        return u;
    }

    public static string Fingerprint(RssItem item)
    {
        var uri = TryExtractPublisherUri(item.Link);
        var host = uri?.Host.ToLowerInvariant() ?? "";
        var path = uri?.AbsolutePath ?? "";
        var titleNorm = Regex.Replace((item.Title ?? "").ToLowerInvariant(), @"\s+", " ").Trim();
        return $"{host}{path}|{titleNorm}";
    }
}
#endregion

#region Google News RSS utilities
internal static class GoogleNews
{
    // Fixed Google News topic codes
    public static readonly Dictionary<Category, string> TopicCodes = new()
    {
        { Category.Business,       "BUSINESS" },
        { Category.Technology,     "TECHNOLOGY" },
        { Category.Entertainment,  "ENTERTAINMENT" },
        { Category.Science,        "SCIENCE" },
        { Category.Sports,         "SPORTS" },
        { Category.Health,         "HEALTH" },
        { Category.Politics,       "NATION" }, // closest fit for domestic/national politics
        { Category.Info,           "WORLD" },  // fallback: world
        { Category.Crime,          "NATION" }, // mapped but overridden by search feed
        { Category.Lifestyle,      "WORLD" },  // map to world/general
    };

    public static string BuildTopStoriesUrl(string lang, string country)
        => $"https://news.google.com/rss?hl={Uri.EscapeDataString(lang)}&gl={Uri.EscapeDataString(country)}&ceid={Uri.EscapeDataString(country)}:{Uri.EscapeDataString(lang)}";

    public static string BuildCategoryUrl(Category category, string lang, string country)
    {
        if (category == Category.Crime)
            return BuildCrimeUrl(lang, country);

        var code = TopicCodes.TryGetValue(category, out var c) ? c : "WORLD";
        return $"https://news.google.com/rss/headlines/section/topic/{code}?hl={Uri.EscapeDataString(lang)}&gl={Uri.EscapeDataString(country)}&ceid={Uri.EscapeDataString(country)}:{Uri.EscapeDataString(lang)}";
    }

    public static string BuildCrimeUrl(string lang, string country)
    {
        var query =
            "(crime OR police OR arrest OR investigation OR shooting OR stabbing OR homicide OR murder OR assault OR kidnapping OR fraud OR trafficking)";
        return $"https://news.google.com/rss/search?q={Uri.EscapeDataString(query)}&hl={Uri.EscapeDataString(lang)}&gl={Uri.EscapeDataString(country)}&ceid={Uri.EscapeDataString(country)}:{Uri.EscapeDataString(lang)}";
    }

    /// <summary>Basic RSS parser that supports Google News Atom/RSS variants.</summary>
    public static async Task<List<RssItem>> FetchAsync(HttpClient http, string url, CancellationToken ct)
    {
        using var res = await http.GetAsync(url, ct);
        res.EnsureSuccessStatusCode();
        await using var s = await res.Content.ReadAsStreamAsync(ct);
        var doc = await XDocument.LoadAsync(s, LoadOptions.None, ct);

        // Try Atom <entry>
        XNamespace atom = "http://www.w3.org/2005/Atom";
        var entries = doc.Root?.Descendants(atom + "entry").ToList();
        if (entries != null && entries.Count > 0)
        {
            return entries.Select(e => new RssItem
            {
                Title = e.Element(atom + "title")?.Value?.Trim() ?? string.Empty,
                Link = e.Element(atom + "link")?.Attribute("href")?.Value ??
                       e.Descendants(atom + "link").FirstOrDefault()?.Attribute("href")?.Value ?? string.Empty,
                Published = ParseDate(e.Element(atom + "updated")?.Value) ?? ParseDate(e.Element(atom + "published")?.Value),
                Summary = (e.Element(atom + "summary")?.Value ?? string.Empty).Trim(),
                Content = (e.Element(atom + "content")?.Value ?? string.Empty).Trim(),
                Source = e.Element(atom + "source")?.Value?.Trim()
            })
            .Where(i => !string.IsNullOrWhiteSpace(i.Title) && !string.IsNullOrWhiteSpace(i.Link))
            .ToList();
        }

        // Try RSS 2.0 <item>
        var channel = doc.Root?.Element("channel");
        if (channel != null)
        {
            return channel.Elements("item").Select(it => new RssItem
            {
                Title = it.Element("title")?.Value?.Trim() ?? string.Empty,
                Link = it.Element("link")?.Value?.Trim() ?? string.Empty,
                Published = ParseDate(it.Element("pubDate")?.Value),
                Summary = (it.Element("description")?.Value ?? string.Empty).Trim(),
                Content = (it.Element("content")?.Value ?? string.Empty).Trim(),
                Source = it.Element("source")?.Value?.Trim()
            })
            .Where(i => !string.IsNullOrWhiteSpace(i.Title) && !string.IsNullOrWhiteSpace(i.Link))
            .ToList();
        }

        return new List<RssItem>();
    }

    private static DateTimeOffset? ParseDate(string? s)
    {
        if (DateTimeOffset.TryParse(s, out var dt)) return dt;
        return null;
    }
}

internal sealed class RssItem
{
    public string Title { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty; // may be empty
    public string? Source { get; set; }
    public DateTimeOffset? Published { get; set; }
}
#endregion

#region Gemini REST client (for paraphrasing/expansion)
public interface IGenerativeTextClient
{
    Task<string> GenerateJsonAsync(string model, string systemInstruction, string userPrompt, double temperature, CancellationToken ct);
}


public sealed class GeminiRestClient : IGenerativeTextClient
{
    private readonly HttpClient _http;
    private readonly ILogger<GeminiRestClient> _log;
    private readonly AiNewsOptions _opts;

    private static readonly object _throttleSync = new();
    private static DateTimeOffset _cooldownUntilUtc = DateTimeOffset.MinValue;
    private static DateTimeOffset _lastThrottleUtc = DateTimeOffset.MinValue;
    private static int _consecutive429 = 0;

    private static readonly TimeSpan MaxCooldown = TimeSpan.FromHours(6);
    private static readonly TimeSpan CooldownResetAfter = TimeSpan.FromMinutes(20);

    public GeminiRestClient(HttpClient http, IOptions<AiNewsOptions> opts, ILogger<GeminiRestClient> log)
    {
        _http = http;
        _log = log;
        _opts = opts.Value;
    }

    public async Task<string> GenerateJsonAsync(string model, string systemInstruction, string userPrompt, double temperature, CancellationToken ct)
    {
        if (IsCoolingDown(out var remaining, out var until))
        {
            _log.LogWarning("Skipping AI call due to active cooldown ({Remaining} remaining, until {Until:u}).", remaining, until);
            return "{}";
        }

        var targetOut = WordsToTokens(_opts.MinWordCount, _opts.OutputTokensPerWord);
        var maxOut = Math.Min(_opts.MaxOutputTokensHardCap, Math.Max(800, targetOut));

        var (ok1, body1) = await CallAsync(model, systemInstruction, userPrompt, temperature, jsonMode: true, maxOut, ct);
        var text = ok1 ? Extract(body1!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}")
        {
            return text!;
        }

        if (IsCoolingDown(out remaining, out until))
        {
            _log.LogWarning("Gemini cooldown engaged after first attempt ({Remaining} remaining).", remaining);
            return "{}";
        }

        var forced = userPrompt + "\n\nReturn ONLY valid JSON per schema in 'items'. No prose outside JSON.";
        var (ok2, body2) = await CallAsync(model, systemInstruction, forced, temperature, jsonMode: false, maxOut, ct);
        text = ok2 ? Extract(body2!) : null;
        if (!string.IsNullOrWhiteSpace(text) && text != "{}")
        {
            return text!;
        }

        if (IsCoolingDown(out remaining, out until))
        {
            _log.LogWarning("Gemini returned no usable JSON; cooldown in effect for {Remaining}.", remaining);
        }
        else
        {
            _log.LogWarning("Gemini returned no usable JSON after retries.");
        }

        return "{}";
    }

    internal static bool TryGetCooldown(out TimeSpan remaining, out DateTimeOffset until)
        => IsCoolingDown(out remaining, out until);

    public static bool IsCoolingDown(out TimeSpan remaining)
        => IsCoolingDown(out remaining, out _);

    private static bool IsCoolingDown(out TimeSpan remaining, out DateTimeOffset until)
    {
        lock (_throttleSync)
        {
            var now = DateTimeOffset.UtcNow;
            if (_cooldownUntilUtc > now)
            {
                remaining = _cooldownUntilUtc - now;
                until = _cooldownUntilUtc;
                return true;
            }

            remaining = TimeSpan.Zero;
            until = DateTimeOffset.MinValue;
            return false;
        }
    }

    private static void RegisterSuccess()
    {
        lock (_throttleSync)
        {
            if (_consecutive429 > 0 || _cooldownUntilUtc > DateTimeOffset.UtcNow)
            {
                _consecutive429 = 0;
                _cooldownUntilUtc = DateTimeOffset.MinValue;
                _lastThrottleUtc = DateTimeOffset.MinValue;
            }
        }
    }

    private TimeSpan ScheduleCooldown(TimeSpan? retryAfter, string? responseBody)
    {
        var baseDelay = retryAfter
            ?? ExtractRetryDelayFromBody(responseBody)
            ?? TimeSpan.FromSeconds(Math.Max(_opts.MinSpacingSeconds, AiGlobalRateLimiter.MinSpacingSeconds));

        var floor = TimeSpan.FromSeconds(Math.Max(5, Math.Max(_opts.MinSpacingSeconds, AiGlobalRateLimiter.MinSpacingSeconds)));
        if (baseDelay < floor)
            baseDelay = floor;

        lock (_throttleSync)
        {
            var now = DateTimeOffset.UtcNow;
            if (now - _lastThrottleUtc > CooldownResetAfter)
            {
                _consecutive429 = 0;
            }

            _consecutive429++;
            _lastThrottleUtc = now;

            var multiplier = Math.Min(_consecutive429 - 1, 5); // up to 32x
            var scaledTicks = baseDelay.Ticks * (1L << multiplier);
            var cooldown = TimeSpan.FromTicks(Math.Min(scaledTicks, MaxCooldown.Ticks));
            if (cooldown < baseDelay)
                cooldown = baseDelay;

            _cooldownUntilUtc = now + cooldown;
            return cooldown;
        }
    }

    private async Task<(bool ok, string? body)> CallAsync(string model, string sys, string prompt, double temperature, bool jsonMode, int maxOutputTokens, CancellationToken ct)
    {
        var gen = new Dictionary<string, object?>
        {
            ["temperature"] = temperature,
            ["candidateCount"] = 1,
            ["maxOutputTokens"] = maxOutputTokens
        };
        if (jsonMode) gen["responseMimeType"] = "application/json";

        var payload = new
        {
            contents = new[] { new { role = "user", parts = new object[] { new { text = prompt } } } },
            systemInstruction = new { role = "system", parts = new object[] { new { text = sys } } },
            generationConfig = gen
        };

        var uri = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
        var json = JsonSerializer.Serialize(payload);

        const int maxAttempts = 2;
        var attempt = 0;

        while (true)
        {
            await AiGlobalRateLimiter.WaitPacingAsync(ct);

            attempt++;
            using var lease = await AiGlobalRateLimiter.AcquireAsync(1, ct);
            if (!lease.IsAcquired)
                throw new Exception("Local Gemini rate limit exceeded (queue full)");

            using var req = new HttpRequestMessage(HttpMethod.Post, uri)
            { Content = new StringContent(json, Encoding.UTF8, "application/json") };
            req.Headers.TryAddWithoutValidation("x-goog-api-key", _opts.ApiKey);

            using var res = await _http.SendAsync(req, ct);
            var body = await res.Content.ReadAsStringAsync(ct);

            if (res.IsSuccessStatusCode)
            {
                RegisterSuccess();
                var min = Math.Max(1, _opts.MinSpacingSeconds);
                var max = Math.Max(min + 1, _opts.MaxSpacingSeconds);
                var next = TimeSpan.FromSeconds(Random.Shared.Next(min, max + 1));
                await AiGlobalRateLimiter.BumpSpacingAsync(next, ct);
                return (true, body);
            }

            var status = (int)res.StatusCode;
            if (status == 429)
            {
                var retryAfter = res.Headers.RetryAfter?.Delta;
                if (res.Headers.RetryAfter?.Date is DateTimeOffset retryDate)
                {
                    var delta = retryDate - DateTimeOffset.UtcNow;
                    if (delta > TimeSpan.Zero)
                        retryAfter = delta;
                }

                var cooldown = ScheduleCooldown(retryAfter, body);
                await AiGlobalRateLimiter.ApplyCooldownAsync(cooldown, ct);
                await AiGlobalRateLimiter.BumpSpacingAsync(cooldown, ct);

                var reason = ExtractQuotaReason(body);
                _log.LogWarning(
                    "Gemini rate limit hit (429). Reason: {Reason}. Cooling down for {Cooldown:g}.",
                    reason ?? res.ReasonPhrase ?? "unknown",
                    cooldown);

                return (false, body);
            }

            if (status >= 500 && attempt < maxAttempts)
            {
                var retryDelay = TimeSpan.FromSeconds(Random.Shared.Next(3, 8));
                await AiGlobalRateLimiter.BumpSpacingAsync(retryDelay, ct);
                await Task.Delay(retryDelay, ct);
                continue;
            }

            await AiGlobalRateLimiter.BumpSpacingAsync(TimeSpan.FromSeconds(Math.Max(1, _opts.MinSpacingSeconds)), ct);
            _log.LogError("Gemini error {Status}: {Body}", status, SafeErr(body));
            return (false, body);
        }
    }

    private static string? Extract(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.ValueKind != JsonValueKind.Array || candidates.GetArrayLength() == 0)
            return null;

        var cand0 = candidates[0];

        static string? FromContent(JsonElement contentEl)
        {
            if (contentEl.ValueKind == JsonValueKind.Object)
            {
                if (contentEl.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array)
                {
                    foreach (var part in parts.EnumerateArray())
                    {
                        if (part.TryGetProperty("text", out var textEl) && textEl.ValueKind == JsonValueKind.String)
                        {
                            var value = textEl.GetString();
                            if (!string.IsNullOrWhiteSpace(value)) return value;
                        }
                    }
                }
            }
            else if (contentEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in contentEl.EnumerateArray())
                {
                    var nested = FromContent(el);
                    if (!string.IsNullOrWhiteSpace(nested)) return nested;
                }
            }

            return null;
        }

        if (cand0.TryGetProperty("content", out var content))
        {
            var textFromContent = FromContent(content);
            if (!string.IsNullOrWhiteSpace(textFromContent)) return textFromContent;
        }

        if (cand0.TryGetProperty("text", out var textEl) && textEl.ValueKind == JsonValueKind.String)
        {
            var value = textEl.GetString();
            if (!string.IsNullOrWhiteSpace(value)) return value;
        }

        if (cand0.TryGetProperty("output_text", out var outputTextEl) && outputTextEl.ValueKind == JsonValueKind.String)
        {
            var value = outputTextEl.GetString();
            if (!string.IsNullOrWhiteSpace(value)) return value;
        }

        return null;
    }

    private static TimeSpan? ExtractRetryDelayFromBody(string? body)
    {
        if (string.IsNullOrWhiteSpace(body)) return null;
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("error", out var error))
                return null;

            if (error.TryGetProperty("details", out var details) && details.ValueKind == JsonValueKind.Array)
            {
                foreach (var detail in details.EnumerateArray())
                {
                    if (detail.ValueKind != JsonValueKind.Object) continue;

                    if (detail.TryGetProperty("retryDelay", out var retryDelayEl) && retryDelayEl.ValueKind == JsonValueKind.String &&
                        TryParseDuration(retryDelayEl.GetString(), out var delay))
                        return delay;

                    if (detail.TryGetProperty("metadata", out var metadata) && metadata.ValueKind == JsonValueKind.Object)
                    {
                        if (metadata.TryGetProperty("retryDelay", out var mdRetry) && mdRetry.ValueKind == JsonValueKind.String &&
                            TryParseDuration(mdRetry.GetString(), out var mdDelay))
                            return mdDelay;

                        if (metadata.TryGetProperty("retry_delay", out var mdRetryAlt) && mdRetryAlt.ValueKind == JsonValueKind.String &&
                            TryParseDuration(mdRetryAlt.GetString(), out var mdDelayAlt))
                            return mdDelayAlt;
                    }
                }
            }

            if (error.TryGetProperty("message", out var messageEl) && messageEl.ValueKind == JsonValueKind.String)
            {
                var message = messageEl.GetString();
                if (!string.IsNullOrWhiteSpace(message))
                {
                    var match = Regex.Match(message, @"retry(?:\s+again)?\s+after\s+(\d+)\s*seconds?", RegexOptions.IgnoreCase);
                    if (match.Success && int.TryParse(match.Groups[1].Value, out var seconds))
                        return TimeSpan.FromSeconds(seconds);
                }
            }
        }
        catch { }
        return null;
    }

    private static bool TryParseDuration(string? value, out TimeSpan result)
    {
        result = TimeSpan.Zero;
        if (string.IsNullOrWhiteSpace(value)) return false;

        value = value.Trim();
        if (value.EndsWith("s", StringComparison.OrdinalIgnoreCase))
        {
            if (double.TryParse(value[..^1], NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds))
            {
                result = TimeSpan.FromSeconds(Math.Max(0, seconds));
                return true;
            }
            return false;
        }
        if (value.EndsWith("m", StringComparison.OrdinalIgnoreCase))
        {
            if (double.TryParse(value[..^1], NumberStyles.Float, CultureInfo.InvariantCulture, out var minutes))
            {
                result = TimeSpan.FromMinutes(Math.Max(0, minutes));
                return true;
            }
            return false;
        }
        if (value.EndsWith("h", StringComparison.OrdinalIgnoreCase))
        {
            if (double.TryParse(value[..^1], NumberStyles.Float, CultureInfo.InvariantCulture, out var hours))
            {
                result = TimeSpan.FromHours(Math.Max(0, hours));
                return true;
            }
            return false;
        }
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var secondsFallback))
        {
            result = TimeSpan.FromSeconds(Math.Max(0, secondsFallback));
            return true;
        }
        return false;
    }

    private static string? ExtractQuotaReason(string? body)
    {
        if (string.IsNullOrWhiteSpace(body)) return null;
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("error", out var error))
                return null;

            if (error.TryGetProperty("message", out var messageEl) && messageEl.ValueKind == JsonValueKind.String)
            {
                var message = messageEl.GetString();
                if (!string.IsNullOrWhiteSpace(message))
                    return message.Length > 280 ? message.Substring(0, 280) + "..." : message;
            }

            if (error.TryGetProperty("details", out var details) && details.ValueKind == JsonValueKind.Array)
            {
                foreach (var detail in details.EnumerateArray())
                {
                    if (detail.ValueKind != JsonValueKind.Object) continue;
                    if (detail.TryGetProperty("reason", out var reasonEl) && reasonEl.ValueKind == JsonValueKind.String)
                    {
                        var reason = reasonEl.GetString();
                        if (!string.IsNullOrWhiteSpace(reason))
                            return reason;
                    }
                }
            }
        }
        catch { }
        return null;
    }

    private static int WordsToTokens(int words, int tenthsTokPerWord)
        => (int)Math.Ceiling(words * (tenthsTokPerWord / 10.0));

    private static string SafeErr(string s) => s.Length > 2000 ? s.Substring(0, 2000) + "...[trunc]" : s;
}
#endregion


#region Prompt builder for PARAPHRASING only (no invention)
internal static class ParaphrasePrompt
{
    public static string BuildSystem(AiNewsOptions o) => $@"
You are a senior news editor and detailed or investigative journalist. Paraphrase and expand using simple, neutral language.

 Hard rules:
 - Output STRICT JSON only (UTF-8). No prose outside JSON.
- Each item: ≥ {o.MinWordCount} words but maximum words is upto your limit possible. ONE <div> root. Use <h2>/<h3> sub-headings. Multiple short <p> paragraphs describing properrly the context for wide range of users. END with sub heading such as: 'What happens next' ,'Expert or Local Perspective', 'Why does this matter?' or similar conclusions based on news.
        - Conclusion: write a brief, story-specific wrap-up under a varied subheading (e.g., 'Key takeaway', 'Outlook', 'The bottom line', 'By the numbers' when appropriate). Avoid stock phrases like 'What happens next' or 'Why does this matter?'.
        - After the conclusion, add a <h2>Sources links and external news coverage on this topic</h2> section listing 1–3 credible links with publisher names. Always include the provided feed link.
        - describe or explain if there are technical words difficult to understand for normal people.
- No fabricated quotes or numbers. But add statistics and important information you have access. 
- Use only the feed info provided plus widely-known, non-controversial background.
- add proper depth to the news articles .
-(very important) Article must look credible and high value content.
- Do not make it look plagiarized or AI written.
- add HTML elements: like bordered tables and comparisions (in necessary case with priority) for high quality content
- (important) try to make every article bit different and prioritize paraphrasing, add Deeper Background and Unique Insights.

Country selection (very important):
- Decide country **from the article’s subject/event location** (look at named places, demonyms, officials, cities).
- DO NOT use publisher origin or Google edition as a proxy.
- If the article is clearly about France (e.g., ‘François Bayrou’, ‘Paris’, ‘rentrée politique’), set countryName='France' and countryCode='FR'.
- If multiple countries are involved, choose the **primary** one in the story. If unclear or truly global → set both to null.

Other fields:
- Provide 5–12 lowercase keywords.
- eventDateUtc = feed publish date (or now if missing).
- isBreaking = true if within last {o.BreakingWindowHours} hours.
";

    public static string BuildUser(string title, string? summary, string? content, string category, string? countryName, string? countryCode, string? publisherName, string link)
    {
        // The model must return AiArticleDraftBatch JSON with one item.
        return $@"
Return JSON shape:
{{
  ""items"": [
    {{
      ""title"": ""unique, specific headline"",
      ""category"": ""{category}"",
      ""articleHtml"": ""<div>..."",
      ""countryName"": null | ""France"" | ""United States"" | ..., 
      ""countryCode"": null | ""FR"" | ""US"" | ...,
      ""keywords"": [""news""],
      ""images"": [],
      ""eventDateUtc"": ""<will be set by caller>"",
      ""isBreaking"": false
    }}
  ]
}}

 

Source snippet to paraphrase and deepen (do NOT copy lines verbatim):
TITLE: {Escape(title)}
SUMMARY: {Escape(summary ?? string.Empty)}
CONTENT: {Escape(content ?? string.Empty)}

Primary source to cite:
PUBLISHER: {Escape(publisherName ?? string.Empty)}
LINK: {Escape(link)}
";
    }

    private static string Escape(string s)
        => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
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
            "crime" => Category.Crime,              // not used here, but kept
            "entertainment" => Category.Entertainment,
            "business" => Category.Business,
            "health" => Category.Health,
            "lifestyle" => Category.Lifestyle,
            "technology" => Category.Technology,
            "science" => Category.Science,
            "sports" => Category.Sports,
            "info" => Category.Info,
            _ => Category.Info
        };
    }

    public static Article MapToArticle(
        AiArticleDraft d,
        Category enforcedCategory,
        ArticleType type,
        Guid authorId,
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
        if (string.IsNullOrWhiteSpace(countryName) || countryName.Equals("global", StringComparison.OrdinalIgnoreCase))
        { countryName = null; countryCode = null; }

        var html = HtmlText.EnsureHtmlDivWithStructure(d.ArticleHtml ?? string.Empty, opts.MinWordCount);
        html = HtmlText.DeGenericizeConclusions(html);

        return new Article
        {
            AuthorId = authorId,
            ArticleType = type,
            Category = enforcedCategory,
            Title = (d.Title ?? string.Empty).Trim(),
            CreatedDate = DateTime.UtcNow,
            Content = html,
            IsBreakingNews = isBreaking,
            CountryName = countryName,
            CountryCode = countryCode,
            Keywords = keywords,
            Images = null // images intentionally omitted
        };
    }

    public static ArticleDto MapToDto(Article article)
        => new()
        {
            Title = article.Title,
            Category = article.Category,
            ArticleType = article.ArticleType,
            Content = article.Content,
            IsBreakingNews = article.IsBreakingNews,
            Images = null,
            CountryName = article.CountryName,
            CountryCode = article.CountryCode,
            Keyword = article.Keywords
        };
}
#endregion

#region Countries.json loader
internal sealed class CountryEntry
{
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;  // e.g., "France"
    [JsonPropertyName("code")] public string Code { get; set; } = string.Empty;  // e.g., "FR"
    [JsonPropertyName("lang")] public string? Lang { get; set; }                // e.g., "fr" (optional)
}

internal static class CountriesFile
{
    public static List<CountryEntry> Load(IServiceProvider sp, ILogger log)
    {
        try
        {
            var env = sp.GetService<IHostEnvironment>();
            var baseDir = env?.ContentRootPath ?? AppContext.BaseDirectory;
            var path = System.IO.Path.Combine(baseDir, "Data", "Countries.json");
            if (!System.IO.File.Exists(path))
            {
                log.LogWarning("Countries.json not found at {Path}. Local country top stories will be skipped.", path);
                return new();
            }
            var json = System.IO.File.ReadAllText(path, Encoding.UTF8);
            var list = JsonSerializer.Deserialize<List<CountryEntry>>(json) ?? new();
            return list.Where(c => !string.IsNullOrWhiteSpace(c.Code)).ToList();
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Failed to load Countries.json. Local country top stories will be skipped.");
            return new();
        }
    }
}
#endregion

#region Core ingest & publish logic (shared by services)
internal static class RssIngest
{
    public static async Task<Article?> ProcessOneAsync(
        IServiceProvider scopeSp,
        AiNewsOptions opts,
        IGenerativeTextClient ai,
        RssItem item,
        Category category,
        string? countryName,
        string? countryCode,
        CancellationToken ct)
    {
        var key = LinkCanon.Fingerprint(item);
        var cacheKey = $"news:{key}";
        var db = scopeSp.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;

        var exists = await db.Set<Article>().AnyAsync(a => a.UniqueKey == key, ct);
        if (exists) return null;

        var cache = scopeSp.GetService<IAiTransientCache>();
        string? json = null;
        if (cache != null && cache.TryGet(cacheKey, out var cached))
        {
            json = cached;
        }

        if (string.IsNullOrWhiteSpace(json))
        {
            var system = ParaphrasePrompt.BuildSystem(opts);
            var user = ParaphrasePrompt.BuildUser(
                title: item.Title,
                summary: item.Summary,
                content: string.IsNullOrWhiteSpace(item.Content) ? item.Summary : item.Content,
                category: category.ToString(),
                countryName: countryName,
                countryCode: countryCode,
                publisherName: item.Source ?? LinkCanon.TryExtractPublisherUri(item.Link)?.Host,
                link: item.Link);

            json = await ai.GenerateJsonAsync(opts.Model, system, user, opts.Creativity, ct);
            if (cache != null && !string.IsNullOrWhiteSpace(json) && json != "{}")
                cache.Set(cacheKey, json, TimeSpan.FromMinutes(5));
        }

        var batch = DeserializeSafe(json ?? "{}");
        if (batch.Items.Count == 0) return null;
        var d = batch.Items[0];

        // Ensure critical fields
        d.EventDateUtc ??= item.Published ?? now;
        d.IsBreaking ??= (now - (d.EventDateUtc ?? now)) <= TimeSpan.FromHours(opts.BreakingWindowHours);

        // Prefer AI-supplied country; only fall back to feed hints if missing
        if (string.IsNullOrWhiteSpace(d.CountryCode) && string.IsNullOrWhiteSpace(d.CountryName))
        {
            if (!string.IsNullOrWhiteSpace(countryCode))
            {
                d.CountryCode = countryCode;
                d.CountryName = countryName;
            }
        }
        else
        {
            // If AI provided a country name without a code, try to derive the code from Countries.json
            if (!string.IsNullOrWhiteSpace(d.CountryName) && string.IsNullOrWhiteSpace(d.CountryCode))
            {
                var countries = CountriesFile.Load(scopeSp, scopeSp.GetRequiredService<ILogger<GoogleNewsCategoryRotationService>>());
                var cc = countries.FirstOrDefault(c =>
                    c.Name.Equals(d.CountryName, StringComparison.OrdinalIgnoreCase))?.Code;
                if (!string.IsNullOrWhiteSpace(cc)) d.CountryCode = cc;
            }
        }

        if (string.IsNullOrWhiteSpace(d.ArticleHtml) && opts.FillMissingHtml)
        {
            var safe = WebUtility.HtmlEncode(item.Summary ?? d.Title);
            d.ArticleHtml = $"<div><h2>Summary</h2><p>{safe}</p></div>";
        }

        var finalCategory = category;
        var aiCat = ArticleMapping.ParseCategoryStrict(d.Category);
        if (finalCategory == Category.Info && aiCat != Category.Info)
            finalCategory = aiCat;
        else if (finalCategory == Category.Info)
            finalCategory = CategoryHeuristics.Guess(item.Title, item.Summary, item.Content);

        var article = ArticleMapping.MapToArticle(d, finalCategory, ArticleType.News,
            authorId: await ResolveAdminIdAsync(db, ct), opts, now);

        article.SourceUrlCanonical = LinkCanon.TryExtractPublisherUri(item.Link)?.ToString();
        // Ensure a Sources section exists, using canonical if available
        var pubHost = LinkCanon.TryExtractPublisherUri(item.Link)?.Host;
        article.Content = HtmlText.AppendSourcesIfMissing(article.Content, article.SourceUrlCanonical ?? item.Link, item.Source ?? pubHost);
        article.UniqueKey = key;
        return article;
    }

    private static async Task<Guid> ResolveAdminIdAsync(AppDbContext db, CancellationToken ct)
    {
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Role == Role.SuperAdmin || u.Role == Role.Admin, ct);
        if (admin is null) throw new InvalidOperationException("No Admin or SuperAdmin found.");
        return admin.Id;
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
            // Strip simple Markdown code fences if present
            if (json.Contains("```"))
            {
                json = json.Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
                           .Replace("```", string.Empty);
            }
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

#region Service: Category rotation (every 10 minutes)
public sealed class GoogleNewsCategoryRotationService : BackgroundService
{
    private readonly ILogger<GoogleNewsCategoryRotationService> _log;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AiNewsOptions _opts;
    private readonly IGenerativeTextClient _ai;
    private readonly HttpClient _http;
    private int _categoryIndex = 0;

    private static readonly Category[] Order = new[]
    {
        Category.Technology, Category.Business, Category.Sports,
        Category.Health, Category.Entertainment, Category.Science,
        Category.Crime, Category.Politics, Category.Info
    };

    public GoogleNewsCategoryRotationService(
        ILogger<GoogleNewsCategoryRotationService> log,
        IServiceScopeFactory scopeFactory,
        IOptions<AiNewsOptions> opts,
        IGenerativeTextClient ai,
        IHttpClientFactory httpFactory)
    {
        _log = log; _scopeFactory = scopeFactory; _opts = opts.Value; _ai = ai;
        _http = httpFactory.CreateClient("gn");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("GoogleNewsCategoryRotationService started (interval {Interval}).", _opts.CategoryRotationInterval);
        var timer = new PeriodicTimer(_opts.CategoryRotationInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await TickAsync(stoppingToken); }
                catch (OperationCanceledException) { }
                catch (Exception ex) { _log.LogError(ex, "Category rotation tick failed."); }
            }
        }
        catch (OperationCanceledException) { }
        finally { timer.Dispose(); _log.LogInformation("Category rotation stopping."); }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var gate = await AiWorkGate.EnterAsync();
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;

        var cat = Order[_categoryIndex % Order.Length];
        _categoryIndex++;

        var url = GoogleNews.BuildCategoryUrl(cat, _opts.DefaultLang, _opts.DefaultCountry);
        var items = await GoogleNews.FetchAsync(_http, url, ct);
        if (items.Count == 0) { _log.LogInformation("No RSS items for {Category}", cat); return; }

        // Prefer the first few (more likely trending), but pick one at random among top 10
        var rnd = new Random();
        var pick = items.Take(10).OrderBy(_ => rnd.Next()).First();

        try
        {
            var article = await RssIngest.ProcessOneAsync(sp, _opts, _ai, pick, cat, null, null, ct);
            if (article is null) { _log.LogInformation("No article produced for category {Category} (dup or empty).", cat); return; }

            var svc = sp.GetRequiredService<ArticleServices>();
            await svc.Publish(ArticleMapping.MapToDto(article), article.AuthorId);
            sp.GetService<IAiTransientCache>()?.Remove($"news:{LinkCanon.Fingerprint(pick)}");
            _log.LogInformation("Inserted category article: {Title} [{Category}]", article.Title, cat);
        }
        catch (Exception ex)
        { _log.LogError(ex, "Failed to publish category article for {Category}.", cat); }
    }
}
#endregion

#region Service: Global top stories (every 30 minutes)
public sealed class GoogleNewsTopStoriesService : BackgroundService
{
    private readonly ILogger<GoogleNewsTopStoriesService> _log;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AiNewsOptions _opts;
    private readonly IGenerativeTextClient _ai;
    private readonly HttpClient _http;

    private static readonly (string Lang, string Country)[] GlobalEditions =
    {
        // English-dominant
    ("en","US"), ("en","GB"), ("en","CA"), ("en","AU"), ("en","NZ"),
    ("en","IE"), ("en","SG"), ("en","IN"), ("en","ZA"), ("en","PH"),

    // Western Europe
    ("fr","FR"), ("fr","CA"), ("fr","BE"), ("fr","CH"),
    ("es","ES"), ("es","MX"), ("es","AR"), ("es","CO"), ("es","CL"), ("es","PE"), ("es","US"),
    ("pt","BR"), ("pt","PT"),
    ("de","DE"), ("de","AT"), ("de","CH"),
    ("it","IT"),
    ("nl","NL"), ("nl","BE"),

    // Nordics + nearby
    ("sv","SE"), ("no","NO"), ("da","DK"), ("fi","FI"), ("is","IS"),

    // Central & Eastern Europe
    ("pl","PL"), ("cs","CZ"), ("sk","SK"), ("hu","HU"),
    ("ro","RO"), ("bg","BG"), ("el","GR"),
    ("ru","RU"), ("uk","UA"), ("lt","LT"), ("lv","LV"), ("et","EE"),
    ("sr","RS"), ("hr","HR"), ("sl","SI"),

    // Middle East & North Africa
    ("ar","AE"), ("ar","SA"),  ("ar","QA"), ("ar","KW"),
    ("he","IL"), ("tr","TR"), 

    // South & Southeast Asia
    ("hi","IN"), ("bn","BD"), ("ur","PK"),
    ("ta","IN"), ("ta","LK"), ("te","IN"), ("ml","IN"), ("mr","IN"),
    ("id","ID"), ("ms","MY"), ("ms","SG"),
    ("th","TH"), ("vi","VN"),

    // East Asia
    ("zh","CN"), ("zh","TW"), ("zh","HK"),
    ("ja","JP"), ("ko","KR"),
    };
    private int _edIdx = 0;

    public GoogleNewsTopStoriesService(
        ILogger<GoogleNewsTopStoriesService> log,
        IServiceScopeFactory scopeFactory,
        IOptions<AiNewsOptions> opts,
        IGenerativeTextClient ai,
        IHttpClientFactory httpFactory)
    {
        _log = log; _scopeFactory = scopeFactory; _opts = opts.Value; _ai = ai;
        _http = httpFactory.CreateClient("gn");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); // slight stagger
        _log.LogInformation("GoogleNewsTopStoriesService started (interval {Interval}).", _opts.TopStoriesInterval);
        var timer = new PeriodicTimer(_opts.TopStoriesInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await TickAsync(stoppingToken); }
                catch (OperationCanceledException) { }
                catch (Exception ex) { _log.LogError(ex, "Top stories tick failed."); }
            }
        }
        catch (OperationCanceledException) { }
        finally { timer.Dispose(); _log.LogInformation("Top stories stopping."); }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var gate = await AiWorkGate.EnterAsync();
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;

        var (lang, country) = GlobalEditions[_edIdx++ % GlobalEditions.Length];
        var url = GoogleNews.BuildTopStoriesUrl(lang, country);
        var items = await GoogleNews.FetchAsync(_http, url, ct);
        if (items.Count == 0) { _log.LogInformation("No global top stories."); return; }

        // Try only 1 insertion from the first 8 items, avoiding duplicates
        var rnd = new Random();
        var seen = new HashSet<string>();
        var picks = items
            .Where(i => seen.Add(LinkCanon.Fingerprint(i)))
            .Take(8)
            .OrderBy(_ => rnd.Next())
            .Take(1)
            .ToList();

        var svc = sp.GetRequiredService<ArticleServices>();
        var db = sp.GetRequiredService<AppDbContext>();
        var adminId = await db.Users.Where(u => u.Role == Role.SuperAdmin || u.Role == Role.Admin).Select(u => u.Id).FirstAsync(ct);

        foreach (var pick in picks)
        {
            try
            {
                var article = await RssIngest.ProcessOneAsync(sp, _opts, _ai, pick, Category.Info, null, null, ct);
                if (article is null) continue;
                await svc.Publish(ArticleMapping.MapToDto(article), adminId);
                // Invalidate cache for this item after publish
                sp.GetService<IAiTransientCache>()?.Remove($"news:{LinkCanon.Fingerprint(pick)}");
                _log.LogInformation("Inserted top story: {Title}", article.Title);
            }
            catch (Exception ex)
            { _log.LogError(ex, "Failed to publish top story for {Link}.", pick.Link); }
        }
    }
}
#endregion

#region Service: Local country top stories from Countries.json (every 15 minutes)
public sealed class GoogleNewsLocalCountryService : BackgroundService
{
    private readonly ILogger<GoogleNewsLocalCountryService> _log;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AiNewsOptions _opts;
    private readonly IGenerativeTextClient _ai;
    private readonly HttpClient _http;
    private List<CountryEntry> _countries = new();
    private readonly Random _rng = new();

    public GoogleNewsLocalCountryService(
        ILogger<GoogleNewsLocalCountryService> log,
        IServiceScopeFactory scopeFactory,
        IOptions<AiNewsOptions> opts,
        IGenerativeTextClient ai,
        IHttpClientFactory httpFactory)
    {
        _log = log; _scopeFactory = scopeFactory; _opts = opts.Value; _ai = ai;
        _http = httpFactory.CreateClient("gn");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); // stagger
        using (var scope = _scopeFactory.CreateScope())
            _countries = CountriesFile.Load(scope.ServiceProvider, _log);

        if (_countries.Count == 0)
        {
            _log.LogWarning("Countries list is empty; local country top stories will not run.");
            return;
        }

        _log.LogInformation("GoogleNewsLocalCountryService started (interval {Interval}).", _opts.LocalTopStoriesInterval);
        var timer = new PeriodicTimer(_opts.LocalTopStoriesInterval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await TickAsync(stoppingToken); }
                catch (OperationCanceledException) { }
                catch (Exception ex) { _log.LogError(ex, "Local country tick failed."); }
            }
        }
        catch (OperationCanceledException) { }
        finally { timer.Dispose(); _log.LogInformation("Local country service stopping."); }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var gate = await AiWorkGate.EnterAsync();
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;

        // Pick a random country
        var c = _countries[_rng.Next(_countries.Count)];
        var lang = string.IsNullOrWhiteSpace(c.Lang) ? _opts.DefaultLang : c.Lang!;
        var url = GoogleNews.BuildTopStoriesUrl(lang, c.Code);
        var items = await GoogleNews.FetchAsync(_http, url, ct);
        if (items.Count == 0) { _log.LogInformation("No top stories for {Code}", c.Code); return; }

        var pick = items.First(); // use the lead headline for locality
        try
        {
            var article = await RssIngest.ProcessOneAsync(sp, _opts, _ai, pick, Category.Info, null, null, ct);
            if (article is null) { _log.LogInformation("No article produced for {Code}", c.Code); return; }
            var svc = sp.GetRequiredService<ArticleServices>();
            await svc.Publish(ArticleMapping.MapToDto(article), article.AuthorId);
            sp.GetService<IAiTransientCache>()?.Remove($"news:{LinkCanon.Fingerprint(pick)}");
            _log.LogInformation("Inserted local top story ({Code}): {Title}", c.Code, article.Title);
        }
        catch (Exception ex)
        { _log.LogError(ex, "Failed to publish local top story for {Code}.", c.Code); }
    }
}
#endregion

#region DI registration helper (replaces old AI-only services)
public static class AiNewsRegistration
{
    public static IServiceCollection AddAiNews(this IServiceCollection services, Action<AiNewsOptions> configure)
    {
        services.Configure(configure);

        // Gemini client with Polly owning timeouts
        services.AddHttpClient<IGenerativeTextClient, GeminiRestClient>(client =>
        {
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            client.Timeout = Timeout.InfiniteTimeSpan;                 // ✅ let Polly handle timeouts
        });
#if false
        .AddStandardResilienceHandler(o =>
        {
            // --- Timeouts ---
            o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(120);       // per-try
            o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(150); // whole pipeline


            // --- Circuit breaker (must satisfy SamplingDuration >= 2 * AttemptTimeout) ---
            o.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(4);  // ✅ >= 120s

            o.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(120);
            o.CircuitBreaker.FailureRatio = 0.2;
            o.CircuitBreaker.MinimumThroughput = 10;
            // Do not break on 429 (Too Many Requests) – let client-side backoff handle it
            o.CircuitBreaker.ShouldHandle = args =>
                new ValueTask<bool>(
                    args.Outcome.Exception is HttpRequestException
                    || args.Outcome.Exception is TimeoutRejectedException
                    || (args.Outcome.Result is { } r &&
                        (r.StatusCode == HttpStatusCode.RequestTimeout || (int)r.StatusCode >= 500))
                );

            // --- Retry (delegate retries/backoff to our client logic) ---
            // Keep at 1 to satisfy options validation (no automatic retries)
            o.Retry.MaxRetryAttempts = 1; // effectively disables retries
            o.Retry.ShouldHandle = _ => new ValueTask<bool>(false);
        });
#endif

        // Lightweight client for Google News RSS pulls
        services.AddHttpClient("gn", client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; NortheastBot/1.0)");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // Hosted services — NEW
        services.AddHostedService<GoogleNewsCategoryRotationService>();
        services.AddHostedService<GoogleNewsTopStoriesService>();

        return services;
    }
}
#endregion
