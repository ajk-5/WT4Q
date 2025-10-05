using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.DTOs;
using Northeast.Models;

namespace Northeast.Services
{
    /// <summary>
    /// AI writer for admin-triggered articles.
    /// - Topic mode: long-form 700+ words article using JSON schema (similar to AiNews output).
    /// - Recent news mode: uses Google News search and the existing paraphrase pipeline.
    /// </summary>
    public sealed class AiArticleWriterService
    {
        private readonly ILogger<AiArticleWriterService> _log;
        private readonly IGenerativeTextClient _ai;
        private readonly IHttpClientFactory _httpFactory;
        private readonly IServiceProvider _sp;
        private readonly AiNewsOptions _opts;
        private readonly IAiTransientCache _cache;

        public AiArticleWriterService(
            ILogger<AiArticleWriterService> log,
            IGenerativeTextClient ai,
            IHttpClientFactory httpFactory,
            IServiceProvider sp,
            IOptions<AiNewsOptions> opts,
            IAiTransientCache cache)
        {
            _log = log; _ai = ai; _httpFactory = httpFactory; _sp = sp; _opts = opts.Value; _cache = cache;
        }

        public async Task<ArticleDto?> WriteFromRecentNewsAsync(Guid authorId, AiWriteRequestDto req, CancellationToken ct)
        {
            try
            {
                if (GeminiRestClient.TryGetCooldown(out var wait, out var until))
                {
                    _log.LogWarning("Skipping AI recent-news write for topic {Topic} because Gemini is cooling down for {Wait:g} (until {Until:u}).", req.Topic, wait, until);
                    return null;
                }

                var http = _httpFactory.CreateClient("gn");
                var lang = string.IsNullOrWhiteSpace(_opts.DefaultLang) ? "en" : _opts.DefaultLang;
                var country = string.IsNullOrWhiteSpace(_opts.DefaultCountry) ? "US" : _opts.DefaultCountry;

                var q = Uri.EscapeDataString(req.Topic);
                var url = $"https://news.google.com/rss/search?q={q}&hl={Uri.EscapeDataString(lang)}&gl={Uri.EscapeDataString(country)}&ceid={Uri.EscapeDataString(country)}:{Uri.EscapeDataString(lang)}";
                var items = await GoogleNews.FetchAsync(http, url, ct);
                if (items.Count == 0) return null;

                var pick = items[0];
                var article = await RssIngest.ProcessOneAsync(_sp, _opts, _ai, pick, req.Category, req.CountryName, req.CountryCode, ct);
                if (article is null) return null;

                var dto = ArticleMapping.MapToDto(article);
                dto.ArticleType = ArticleType.News;
                return dto;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Recent news AI write failed for topic: {Topic}", req.Topic);
                return null;
            }
        }

        public async Task<ArticleDto?> WriteFromTopicAsync(Guid authorId, AiWriteRequestDto req, CancellationToken ct)
        {
            try
            {
                if (GeminiRestClient.TryGetCooldown(out var waitTopic, out var untilTopic))
                {
                    _log.LogWarning("Skipping AI topic write for {Topic} because Gemini is cooling down for {Wait:g} (until {Until:u}).", req.Topic, waitTopic, untilTopic);
                    return null;
                }

                var system = BuildTopicSystemInstruction(minWords: 700);
                var user = BuildTopicUserPrompt(req.Topic, req.Category);

                var key = $"topic:{req.Category}|{(req.Topic ?? string.Empty).Trim().ToLowerInvariant()}";
                string json;
                var fromCache = _cache.TryGet(key, out json);
                if (!fromCache)
                {
                    json = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
                    if (!string.IsNullOrWhiteSpace(json) && json != "{}")
                        _cache.Set(key, json, TimeSpan.FromMinutes(5));
                }

                var batch = RssIngest.DeserializeSafe(json);
                if (batch.Items.Count == 0)
                {
                    _log.LogWarning("AI returned no items for topic: {Topic}", req.Topic);
                    return null;
                }
                var d = batch.Items[0];

                // If we served from cache and article is still too short, try one fresh expansion
                var words = Northeast.Utilities.HtmlText.CountWords(d.ArticleHtml);
                if (fromCache && words < 700)
                {
                    var regen = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
                    if (!string.IsNullOrWhiteSpace(regen) && regen != "{}")
                    {
                        _cache.Set(key, regen, TimeSpan.FromMinutes(5));
                        var rebatch = RssIngest.DeserializeSafe(regen);
                        if (rebatch.Items.Count > 0)
                            d = rebatch.Items[0];
                    }
                }

                d.IsBreaking = false;
                d.CountryCode ??= null;
                d.CountryName ??= null;

                var article = ArticleMapping.MapToArticle(
                    d,
                    enforcedCategory: req.Category,
                    type: ArticleType.Article,
                    authorId: authorId,
                    opts: _opts,
                    nowUtc: DateTimeOffset.UtcNow);

                return ArticleMapping.MapToDto(article);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Topic AI write failed for topic: {Topic}", req.Topic);
                // Fallback to any cached JSON if present
                var key = $"topic:{req.Category}|{(req.Topic ?? string.Empty).Trim().ToLowerInvariant()}";
                if (_cache.TryGet(key, out var cached))
                {
                    var batch = RssIngest.DeserializeSafe(cached);
                    if (batch.Items.Count > 0)
                    {
                        var d = batch.Items[0];
                        d.IsBreaking = false;
                        d.CountryCode ??= null;
                        d.CountryName ??= null;
                        var article = ArticleMapping.MapToArticle(
                            d,
                            enforcedCategory: req.Category,
                            type: ArticleType.Article,
                            authorId: authorId,
                            opts: _opts,
                            nowUtc: DateTimeOffset.UtcNow);
                        return ArticleMapping.MapToDto(article);
                    }
                }
                return null;
            }
        }

        private static string BuildTopicSystemInstruction(int minWords)
        {
            return $@"You are a senior editor and explainer writer producing high-value, original articles.

Hard rules:
- Output STRICT JSON only (UTF-8). No prose outside JSON.
- JSON shape:
{{
  ""items"": [
    {{
      ""title"": ""unique, specific headline"",
      ""category"": ""<category>"",
      ""articleHtml"": ""<div>...</div>"",
      ""countryName"": null,
      ""countryCode"": null,
      ""keywords"": [""comma"", ""separated"", ""keywords""],
      ""images"": [],
      ""eventDateUtc"": ""<will be set by caller>"",
      ""isBreaking"": false
    }}
  ]
}}

Article requirements:
- Length: {minWords}-1000 words.
- Output EXACTLY ONE HTML block in articleHtml: <div> ... </div>
- Use simple, natural language. Avoid AI cliches.
- Include an intro and at least two <h2> sub-headings.
- End with a concise, topic-specific conclusion under a varied subheading.
- Avoid external links; cite facts in natural prose.
- Include: <meta data-keywords=""comma, separated, keywords""></meta> at the end.
- Use short paragraphs, optional lists/tables where helpful.
- No invented facts; if uncertain, acknowledge limitations.
 - Rely on broad, well-known knowledge; avoid speculation. Do not copy; synthesize and paraphrase to avoid plagiarism.
 - Generate your own headline that fits the most newsworthy angle (ignore the raw topic text for the title).";
        }

        private static string BuildTopicUserPrompt(string topic, Category category)
        {
            var cat = category.ToString();
            var safeTopic = (topic ?? string.Empty).Trim();
            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"Write an original long-form article.");
            sb.AppendLine();
            sb.AppendLine($"Topic: {Escape(safeTopic)}");
            sb.AppendLine($"Category: {Escape(cat)}");
            sb.AppendLine();
            sb.AppendLine("Produce the JSON with one item as per schema above. The articleHtml must be 700–1000 words, original and well-paraphrased.");
            sb.AppendLine("Generate a compelling, original title that best fits the story — do not reuse the provided topic text.");
            return sb.ToString();
        }

        private static string Escape(string s)
            => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
