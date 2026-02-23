using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.DTOs;
using Northeast.Models;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Northeast.Services
{
    /// <summary>
    /// AI writer for admin-triggered articles.
    /// - Topic mode: 90s-focused long-form article or quiz using JSON schema.
    /// - Recent news mode is disabled for the 90s site.
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

        public Task<ArticleDto?> WriteFromRecentNewsAsync(Guid authorId, AiWriteRequestDto req, CancellationToken ct)
        {
            _log.LogWarning("Recent-news AI mode is disabled for the 90s site.");
            return Task.FromResult<ArticleDto?>(null);
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

                var template = NormalizeTemplate(req.Template);
                var minWords = ComputeMinWords(req.ArticleType, template);
                var system = BuildTopicSystemInstruction(minWords, req.ArticleType, template);

                var onThisDayFacts = template == AiTemplates.OnThisDay
                    ? await TryGetOnThisDayFactsAsync(DateTimeOffset.UtcNow, ct)
                    : null;

                var user = BuildTopicUserPrompt(req.Topic, req.Category, req.ArticleType, template, onThisDayFacts);

                var key = $"topic:{req.Category}|{template ?? "default"}|{(req.Topic ?? string.Empty).Trim().ToLowerInvariant()}";
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
                if (fromCache && words < minWords)
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
                    type: req.ArticleType == ArticleType.QnA ? ArticleType.QnA : ArticleType.Article,
                    authorId: authorId,
                    opts: _opts,
                    nowUtc: DateTimeOffset.UtcNow);

                var dto = ArticleMapping.MapToDto(article);
                ApplyTemplateEnforcements(template, dto);
                return dto;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Topic AI write failed for topic: {Topic}", req.Topic);
                // Fallback to any cached JSON if present
                var template = NormalizeTemplate(req.Template);
                var key = $"topic:{req.Category}|{template ?? "default"}|{(req.Topic ?? string.Empty).Trim().ToLowerInvariant()}";
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
                        var dto = ArticleMapping.MapToDto(article);
                        ApplyTemplateEnforcements(template, dto);
                        return dto;
                    }
                }
                return null;
            }
        }

        private static string BuildTopicSystemInstruction(int minWords, ArticleType type, string? template)
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("You are a 90s culture editor writing nostalgic, human-sounding content.");
            sb.AppendLine();
            sb.AppendLine("Hard rules:");
            sb.AppendLine("- Output STRICT JSON only (UTF-8). No prose outside JSON.");
            sb.AppendLine("- JSON shape:");
            sb.AppendLine("{");
            sb.AppendLine("  \"items\": [");
            sb.AppendLine("    {");
            sb.AppendLine("      \"title\": \"unique, specific headline\",");
            sb.AppendLine("      \"category\": \"<category>\",");
            sb.AppendLine("      \"articleHtml\": \"<div>...</div>\",");
            sb.AppendLine("      \"countryName\": null,");
            sb.AppendLine("      \"countryCode\": null,");
            sb.AppendLine("      \"keywords\": [\"comma\", \"separated\", \"keywords\"],");
            sb.AppendLine("      \"images\": [],");
            sb.AppendLine("      \"eventDateUtc\": null,");
            sb.AppendLine("      \"isBreaking\": false");
            sb.AppendLine("    }");
            sb.AppendLine("  ]");
            sb.AppendLine("}");
            sb.AppendLine();
            sb.AppendLine("Article requirements:");
            sb.AppendLine($"- Length: {minWords}-1000 words.");
            sb.AppendLine("- Output EXACTLY ONE HTML block in articleHtml: <div> ... </div>");
            sb.AppendLine("- Keep the focus on the 1990s and nostalgia for the decade.");
            sb.AppendLine("- Avoid current events and avoid explicit or sexual content.");
            sb.AppendLine("- Include an intro and at least two <h2> sub-headings.");
            sb.AppendLine("- End with a concise, topic-specific conclusion under a varied subheading.");
            sb.AppendLine("- keywords must be a JSON array of 5-12 lowercase strings (not a single comma-separated string).");
            sb.AppendLine("- Include: <meta data-keywords='comma, separated, keywords'></meta> at the end (use single quotes for attributes).");
            sb.AppendLine("- Use short paragraphs, optional lists/tables where helpful.");
            sb.AppendLine("- No invented facts; if uncertain, acknowledge limitations.");
            sb.AppendLine("- Generate your own headline that fits the most memorable angle.");

            if (template == AiTemplates.Jokes)
            {
                sb.AppendLine();
                sb.AppendLine("Jokes requirements:");
                sb.AppendLine("- Provide 12-18 short, family-friendly 90s-themed jokes or one-liners.");
                sb.AppendLine("- Format as an ordered list (<ol><li>...</li></ol>) inside the <div>.");
                sb.AppendLine("- No discriminatory, explicit, or mean-spirited humor.");
                sb.AppendLine("- Keep each joke to 1-2 sentences.");
            }
            else if (template == AiTemplates.BlastFromThePast)
            {
                sb.AppendLine();
                sb.AppendLine("Blast from the Past requirements:");
                sb.AppendLine("- Focus on ONE specific 90s moment, trend, product, game, show, album, or cultural phenomenon.");
                sb.AppendLine("- Include: what it was, why it mattered then, and why it still hits today.");
                sb.AppendLine("- Add a short \"Try it now\" section with ideas to relive it.");
            }
            else if (template == AiTemplates.OnThisDay)
            {
                sb.AppendLine();
                sb.AppendLine("On This Day requirements:");
                sb.AppendLine("- If the user prompt includes a Facts section, ONLY use those dated facts (do not add new dated events).");
                sb.AppendLine("- Present a timeline list with years and short descriptions.");
                sb.AppendLine("- Keep the tone nostalgic and celebratory.");
            }

            if (type == ArticleType.QnA)
            {
                sb.AppendLine();
                sb.AppendLine("Quiz requirements:");
                sb.AppendLine("- Create 8-12 questions about the 90s topic.");
                sb.AppendLine("- Use numbered questions with 3-4 multiple-choice options.");
                sb.AppendLine("- Include an answer key section at the end.");
                sb.AppendLine("- Keep the tone playful and nostalgic.");
            }

            return sb.ToString();
        }

        private static string BuildTopicUserPrompt(
            string topic,
            Category category,
            ArticleType type,
            string? template,
            string? extraFacts)
        {
            var cat = category.ToString();
            var safeTopic = (topic ?? string.Empty).Trim();
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("Write an original 90s-focused piece.");
            sb.AppendLine();
            sb.AppendLine($"Topic: {Escape(safeTopic)}");
            sb.AppendLine($"Category: {Escape(cat)}");
            sb.AppendLine($"Format: {(type == ArticleType.QnA ? "Quiz/Q&A" : "Feature article")}");
            if (!string.IsNullOrWhiteSpace(template))
                sb.AppendLine($"Template: {Escape(template)}");
            sb.AppendLine();
            if (!string.IsNullOrWhiteSpace(extraFacts))
            {
                sb.AppendLine(extraFacts);
                sb.AppendLine();
            }
            sb.AppendLine("Produce the JSON with one item as per schema above.");
            sb.AppendLine("Generate a compelling, original title that fits the angle.");
            sb.AppendLine("The articleHtml must be original, well-paraphrased, and 90s-centered.");
            return sb.ToString();
        }

        private static int ComputeMinWords(ArticleType type, string? template)
        {
            if (type == ArticleType.QnA) return 350;

            return template switch
            {
                AiTemplates.Jokes => 220,
                AiTemplates.OnThisDay => 520,
                AiTemplates.BlastFromThePast => 650,
                _ => 700,
            };
        }

        private static string? NormalizeTemplate(string? template)
        {
            if (string.IsNullOrWhiteSpace(template)) return null;
            return template.Trim().ToLowerInvariant() switch
            {
                "joke" => AiTemplates.Jokes,
                "jokes" => AiTemplates.Jokes,
                "blast" => AiTemplates.BlastFromThePast,
                "blast_from_the_past" => AiTemplates.BlastFromThePast,
                "blast-from-the-past" => AiTemplates.BlastFromThePast,
                "on_this_day" => AiTemplates.OnThisDay,
                "on-this-day" => AiTemplates.OnThisDay,
                "on_this_day_in_the_90s" => AiTemplates.OnThisDay,
                "on-this-day-in-the-90s" => AiTemplates.OnThisDay,
                _ => template.Trim().ToLowerInvariant(),
            };
        }

        private static void ApplyTemplateEnforcements(string? template, ArticleDto dto)
        {
            if (dto == null) return;

            if (template == AiTemplates.OnThisDay)
            {
                EnsureTitlePrefix(dto, "On This Day in the 90s:");
                dto.Keyword = MergeKeywords(dto.Keyword, "on-this-day", "on-this-day-90s", "90s");
            }
            else if (template == AiTemplates.BlastFromThePast)
            {
                EnsureTitlePrefix(dto, "Blast from the Past:");
                dto.Keyword = MergeKeywords(dto.Keyword, "blast-from-the-past", "throwback", "90s");
            }
            else if (template == AiTemplates.Jokes)
            {
                EnsureTitlePrefix(dto, "90s Jokes:");
                dto.Keyword = MergeKeywords(dto.Keyword, "jokes", "one-liners", "humor", "90s");
            }
        }

        private static void EnsureTitlePrefix(ArticleDto dto, string prefix)
        {
            if (string.IsNullOrWhiteSpace(prefix)) return;
            var title = dto.Title?.Trim() ?? string.Empty;
            if (title.Length == 0) return;

            if (title.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return;

            // Avoid double-prefixing similar titles (e.g. "On this day..." without the exact punctuation)
            var normalizedPrefix = prefix.TrimEnd(':').Trim();
            if (title.StartsWith(normalizedPrefix, StringComparison.OrdinalIgnoreCase))
                return;

            dto.Title = $"{prefix} {title}";
        }

        private static List<string> MergeKeywords(List<string>? existing, params string[] keywords)
        {
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (existing != null)
            {
                foreach (var k in existing)
                {
                    if (!string.IsNullOrWhiteSpace(k))
                        set.Add(k.Trim());
                }
            }

            foreach (var k in keywords)
            {
                if (!string.IsNullOrWhiteSpace(k))
                    set.Add(k.Trim().ToLowerInvariant());
            }

            return set.Take(16).ToList();
        }

        private async Task<string?> TryGetOnThisDayFactsAsync(DateTimeOffset nowUtc, CancellationToken ct)
        {
            try
            {
                var month = nowUtc.Month;
                var day = nowUtc.Day;
                var cacheKey = $"onthisday:{month:D2}-{day:D2}";
                if (_cache.TryGet(cacheKey, out var cached) && !string.IsNullOrWhiteSpace(cached))
                    return cached;

                var http = _httpFactory.CreateClient("research");
                using var req = new HttpRequestMessage(HttpMethod.Get,
                    $"https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}");
                req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                using var res = await http.SendAsync(req, ct);
                if (!res.IsSuccessStatusCode) return null;

                await using var stream = await res.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                if (!doc.RootElement.TryGetProperty("events", out var eventsEl) ||
                    eventsEl.ValueKind != JsonValueKind.Array)
                {
                    return null;
                }

                var facts = new List<(int Year, string Text, string? Link)>();
                foreach (var ev in eventsEl.EnumerateArray())
                {
                    if (!ev.TryGetProperty("year", out var yearEl) || yearEl.ValueKind != JsonValueKind.Number)
                        continue;
                    if (!ev.TryGetProperty("text", out var textEl) || textEl.ValueKind != JsonValueKind.String)
                        continue;

                    var year = yearEl.GetInt32();
                    if (year < 1990 || year > 1999)
                        continue;

                    var text = (textEl.GetString() ?? string.Empty).Trim();
                    if (string.IsNullOrWhiteSpace(text))
                        continue;

                    string? link = null;
                    if (ev.TryGetProperty("pages", out var pagesEl) && pagesEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var page in pagesEl.EnumerateArray())
                        {
                            if (page.TryGetProperty("content_urls", out var contentUrls) &&
                                contentUrls.TryGetProperty("desktop", out var desktop) &&
                                desktop.TryGetProperty("page", out var pageUrl) &&
                                pageUrl.ValueKind == JsonValueKind.String)
                            {
                                link = pageUrl.GetString();
                                break;
                            }
                        }
                    }

                    // Keep the facts compact to reduce prompt length
                    if (text.Length > 240)
                        text = text[..240].TrimEnd() + "…";

                    facts.Add((year, text, link));
                }

                if (facts.Count == 0) return null;

                var sb = new System.Text.StringBuilder();
                sb.AppendLine("Facts (Wikipedia On This Day feed; 1990s-only):");
                foreach (var fact in facts
                    .OrderBy(f => f.Year)
                    .Take(10))
                {
                    sb.Append("- ").Append(fact.Year).Append(" — ").Append(fact.Text);
                    if (!string.IsNullOrWhiteSpace(fact.Link))
                        sb.Append(" (").Append(fact.Link).Append(')');
                    sb.AppendLine();
                }

                var result = sb.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(result))
                    _cache.Set(cacheKey, result, TimeSpan.FromHours(20));

                return result;
            }
            catch
            {
                return null;
            }
        }

        private static string Escape(string s)
            => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    internal static class AiTemplates
    {
        public const string Jokes = "jokes";
        public const string BlastFromThePast = "blast_from_the_past";
        public const string OnThisDay = "on_this_day";
    }
}
