using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Services
{
    /// <summary>
    /// Background service that writes a random category article every 10 minutes.
    /// </summary>
    public class AutoArticleWriterService : BackgroundService
    {
        private readonly ILogger<AutoArticleWriterService> _log;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly Random _rng = new();

        public AutoArticleWriterService(ILogger<AutoArticleWriterService> log,
            IServiceScopeFactory scopeFactory)
        {
            _log = log;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
            _log.LogInformation("AutoArticleWriterService started.");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await TickAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "Auto writer tick failed.");
                }
                await timer.WaitForNextTickAsync(stoppingToken);
            }
        }

        private async Task TickAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var author = scope.ServiceProvider.GetRequiredService<AuthorResolver>();
            var factory = scope.ServiceProvider.GetRequiredService<ArticleFactory>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var authorId = await author.GetAuthorIdAsync(ct);
            var cats = Enum.GetValues(typeof(Category)).Cast<Category>().ToArray();
            var category = cats[_rng.Next(cats.Length)];
            var article = await factory.FromRandomCategoryAsync(authorId, category, ct);
            db.Set<Article>().Add(article);
            await db.SaveChangesAsync(ct);
        }
    }
}
