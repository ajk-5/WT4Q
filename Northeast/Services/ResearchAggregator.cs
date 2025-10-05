using System.Xml.Linq;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Northeast.Services
{
    public sealed record ResearchItem
    (
        string Title,
        string Link,
        string? Summary,
        string? Source,
        DateTimeOffset? Published
    );

    /// <summary>
    /// Lightweight open‑web research aggregator. Pulls topic‑related context from
    /// Wikipedia REST and several public RSS feeds (Reuters, BBC, Guardian, AP).
    /// </summary>
    public sealed class ResearchAggregator
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<ResearchAggregator> _log;

        private static readonly string[] RssFeeds = new[]
        {
            // Global/general feeds (non‑Google sources)
            "http://feeds.bbci.co.uk/news/rss.xml",
            "https://www.theguardian.com/world/rss",
            "https://feeds.reuters.com/reuters/topNews",
            "https://apnews.com/hub/apf-topnews?utm_source=apnews.com&utm_medium=referral&utm_campaign=apf-topnews&output=rss"
        };

        public ResearchAggregator(IHttpClientFactory httpFactory, ILogger<ResearchAggregator> log)
        { _httpFactory = httpFactory; _log = log; }

        public async Task<List<ResearchItem>> GatherAsync(string topic, int maxItems = 8, CancellationToken ct = default)
        {
            var http = _httpFactory.CreateClient("research");
            var results = new List<ResearchItem>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // 1) Wikipedia summary (if available)
            try
            {
                var title = Uri.EscapeDataString(topic.Trim());
                var url = $"https://en.wikipedia.org/api/rest_v1/page/summary/{title}";
                using var res = await http.GetAsync(url, ct);
                if (res.IsSuccessStatusCode)
                {
                    using var json = await System.Text.Json.JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                    if (json.RootElement.TryGetProperty("title", out var t)
                        && json.RootElement.TryGetProperty("extract", out var ex)
                        && json.RootElement.TryGetProperty("content_urls", out var cu)
                        && cu.TryGetProperty("desktop", out var desk)
                        && desk.TryGetProperty("page", out var page))
                    {
                        var link = page.GetString() ?? string.Empty;
                        results.Add(new ResearchItem(
                            t.GetString() ?? topic,
                            link,
                            ex.GetString(),
                            "Wikipedia",
                            null));
                        seen.Add(Fingerprint(link));
                    }
                }
            }
            catch (Exception ex) { _log.LogDebug(ex, "Wikipedia fetch failed for topic '{Topic}'", topic); }

            // 2) RSS feeds (filter by topic keywords in title/description)
            foreach (var feed in RssFeeds)
            {
                try
                {
                    var items = await FetchRssAsync(http, feed, ct);
                    foreach (var i in items)
                    {
                        if (results.Count >= maxItems) break;
                        var text = (i.Title + "\n" + (i.Summary ?? string.Empty)).ToLowerInvariant();
                        var q = topic.ToLowerInvariant();
                        if (!text.Contains(q)) continue;
                        var fp = Fingerprint(i.Link);
                        if (!seen.Add(fp)) continue;
                        results.Add(i);
                    }
                }
                catch (Exception ex) { _log.LogDebug(ex, "RSS fetch failed: {Feed}", feed); }
            }

            return results;
        }

        private static string Fingerprint(string? link)
        {
            if (string.IsNullOrWhiteSpace(link)) return string.Empty;
            try
            {
                var uri = new Uri(link);
                var host = uri.Host.ToLowerInvariant();
                var path = uri.AbsolutePath;
                return host + path;
            }
            catch { return link!; }
        }

        private static async Task<List<ResearchItem>> FetchRssAsync(HttpClient http, string url, CancellationToken ct)
        {
            using var res = await http.GetAsync(url, ct);
            res.EnsureSuccessStatusCode();
            await using var s = await res.Content.ReadAsStreamAsync(ct);
            var doc = await XDocument.LoadAsync(s, LoadOptions.None, ct);

            var list = new List<ResearchItem>();
            // Try RSS 2.0
            var channel = doc.Root?.Element("channel");
            if (channel != null)
            {
                foreach (var it in channel.Elements("item"))
                {
                    var title = it.Element("title")?.Value?.Trim() ?? string.Empty;
                    var link = it.Element("link")?.Value?.Trim() ?? string.Empty;
                    var desc = it.Element("description")?.Value?.Trim();
                    var pub = it.Element("pubDate")?.Value;
                    DateTimeOffset? published = null;
                    if (DateTimeOffset.TryParse(pub, out var p)) published = p;
                    var source = TryGetHost(link);
                    if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(link))
                        list.Add(new ResearchItem(title, link, StripTags(desc), source, published));
                }
                return list;
            }

            // Try Atom
            XNamespace atom = "http://www.w3.org/2005/Atom";
            var entries = doc.Root?.Descendants(atom + "entry");
            if (entries != null)
            {
                foreach (var e in entries)
                {
                    var title = e.Element(atom + "title")?.Value?.Trim() ?? string.Empty;
                    var link = e.Element(atom + "link")?.Attribute("href")?.Value ?? string.Empty;
                    var sum = e.Element(atom + "summary")?.Value?.Trim();
                    var upd = e.Element(atom + "updated")?.Value ?? e.Element(atom + "published")?.Value;
                    DateTimeOffset? published = null;
                    if (DateTimeOffset.TryParse(upd, out var p)) published = p;
                    var source = TryGetHost(link);
                    if (!string.IsNullOrWhiteSpace(title) && !string.IsNullOrWhiteSpace(link))
                        list.Add(new ResearchItem(title, link, StripTags(sum), source, published));
                }
            }
            return list;
        }

        private static string? StripTags(string? html)
        {
            if (string.IsNullOrWhiteSpace(html)) return html;
            return Regex.Replace(html, "<[^>]+>", " ").Trim();
        }

        private static string? TryGetHost(string? link)
        {
            if (Uri.TryCreate(link ?? string.Empty, UriKind.Absolute, out var u)) return u.Host;
            return null;
        }
    }
}

