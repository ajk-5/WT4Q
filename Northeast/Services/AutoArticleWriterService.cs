using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
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
        private readonly AuthorResolver _author;
        private readonly ArticleFactory _factory;
        private readonly AppDbContext _db;
        private readonly Random _rng = new();

        public AutoArticleWriterService(ILogger<AutoArticleWriterService> log,
            AuthorResolver author,
            ArticleFactory factory,
            AppDbContext db)
        {
            _log = log;
            _author = author;
            _factory = factory;
            _db = db;
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
            var authorId = await _author.GetAuthorIdAsync(ct);
            var cats = Enum.GetValues(typeof(Category)).Cast<Category>().ToArray();
            var category = cats[_rng.Next(cats.Length)];
            var article = await _factory.FromRandomCategoryAsync(authorId, category, ct);
            _db.Set<Article>().Add(article);
            await _db.SaveChangesAsync(ct);
        }
    }
}
