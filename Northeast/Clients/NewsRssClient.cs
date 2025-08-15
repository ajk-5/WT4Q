using System.ServiceModel.Syndication;
using System.Xml;
using Northeast.Utilities;

namespace Northeast.Clients
{
    /// <summary>
    /// Lightweight RSS client that aggregates several trending feeds.
    /// </summary>
    public class NewsRssClient
    {
        private readonly HttpClient _http;

        // Global trending feeds.
        private static readonly string[] Feeds = new[]
        {
            "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
            "https://feeds.reuters.com/reuters/topNews",
            "https://apnews.com/apf-topnews?output=rss"
        };

        public NewsRssClient(HttpClient http) => _http = http;

        public async Task<IReadOnlyList<TrendingItem>> GetTrendingAsync(CancellationToken ct)
        {
            var items = new List<TrendingItem>();

            foreach (var feedUrl in Feeds)
            {
                using var stream = await _http.GetStreamAsync(feedUrl, ct);
                using var reader = XmlReader.Create(stream);
                var feed = SyndicationFeed.Load(reader);
                if (feed == null) continue;

                foreach (var e in feed.Items)
                {
                    var link = e.Links?.FirstOrDefault()?.Uri?.ToString() ?? string.Empty;
                    var title = HtmlText.Strip(e.Title?.Text ?? string.Empty);
                    var summary = HtmlText.Strip(e.Summary?.Text ?? string.Empty);
                    var published = e.PublishDate.UtcDateTime == default ? DateTime.UtcNow : e.PublishDate.UtcDateTime;
                    var source = feed.Title?.Text ?? "Unknown";

                    if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(link))
                        continue;

                    items.Add(new TrendingItem
                    {
                        Title = title,
                        Url = link,
                        Summary = summary,
                        Source = source,
                        PublishedUtc = published,
                        CountryName = null,
                        CountryCode = null
                    });
                }
            }

            return items;
        }
    }

    public class TrendingItem
    {
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public DateTime PublishedUtc { get; set; }
        public string? CountryName { get; set; }
        public string? CountryCode { get; set; }
    }
}
