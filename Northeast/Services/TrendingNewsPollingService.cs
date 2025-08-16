/*using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Northeast.Clients;
using Northeast.Data;
using Northeast.Models;
using Northeast.Utilities;

namespace Northeast.Services
{
    /// <summary>
    /// Background service that polls trending news feeds every 5 minutes.
    /// </summary>
    public class TrendingNewsPollingService : BackgroundService
    {
        private readonly ILogger<TrendingNewsPollingService> _log;
        private readonly IServiceScopeFactory _scopeFactory;

        public TrendingNewsPollingService(ILogger<TrendingNewsPollingService> log,
            IServiceScopeFactory scopeFactory)
        {
            _log = log;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var timer = new PeriodicTimer(TimeSpan.FromMinutes(3));
            _log.LogInformation("TrendingNewsPollingService started.");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await TickAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "Trending polling tick failed.");
                }
                await timer.WaitForNextTickAsync(stoppingToken);
            }
        }

        private async Task TickAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var rss = scope.ServiceProvider.GetRequiredService<NewsRssClient>();
            var author = scope.ServiceProvider.GetRequiredService<AuthorResolver>();
            var factory = scope.ServiceProvider.GetRequiredService<ArticleFactory>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dedup = scope.ServiceProvider.GetRequiredService<Deduplication>();

            var items = await rss.GetTrendingAsync(ct);
            if (items.Count == 0) return;
            var authorId = await author.GetAuthorIdAsync(ct);

            foreach (var item in items.Take(12))
            {
                var category = InferCategory(item);
                if (await dedup.ExistsAsync(item.Title, item.Url, ct))
                    continue;

                var article = await factory.FromTrendingAsync(authorId, category, item.Title, item.Source, item.Url, item.Summary, ct);
                db.Set<Article>().Add(article);
            }

            await db.SaveChangesAsync(ct);
        }

        private static Category InferCategory(TrendingItem it)
        {
            var t = it.Title.ToLowerInvariant();
            if (t.Contains("crypto") || t.Contains("market") || t.Contains("bank") || t.Contains("stock"))
                return Category.Business;
            if (t.Contains("covid") || t.Contains("health") || t.Contains("cancer"))
                return Category.Health;
            if (t.Contains("iphone") || t.Contains("ai") || t.Contains("microsoft") || t.Contains("google"))
                return Category.Technology;
            if (t.Contains("football") || t.Contains("olympics") || t.Contains("tennis"))
                return Category.Sports;
            if (t.Contains("film") || t.Contains("music") || t.Contains("celebrity"))
                return Category.Entertainment;
            if (t.Contains("crime") || t.Contains("police") || t.Contains("court"))
                return Category.Crime;
            if (t.Contains("election") || t.Contains("parliament") || t.Contains("president"))
                return Category.Politics;
            return Category.Info;
        }
    }
}
*/