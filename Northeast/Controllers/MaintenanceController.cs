using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "SuperAdminOnly")]
    public sealed class MaintenanceController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<MaintenanceController> _log;

        public MaintenanceController(AppDbContext db, ILogger<MaintenanceController> log)
        {
            _db = db;
            _log = log;
        }

        /// <summary>
        /// Purges legacy content from the database.
        /// - mode=news (default): deletes ArticleType.News and dependent rows.
        /// - mode=all: deletes ALL articles and dependent rows.
        /// Requires confirm=PURGE to avoid accidental deletes.
        /// </summary>
        [HttpDelete("articles")]
        public async Task<IActionResult> PurgeArticles(
            [FromQuery] string mode = "news",
            [FromQuery] string confirm = "",
            CancellationToken ct = default)
        {
            if (!string.Equals(confirm, "PURGE", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Confirmation required. Pass confirm=PURGE." });
            }

            var normalizedMode = (mode ?? "news").Trim().ToLowerInvariant();

            IQueryable<Article> articlesQuery = _db.Articles;
            if (normalizedMode is "news" or "legacy" or "legacy-news" or "legacy_news")
            {
                articlesQuery = articlesQuery.Where(a => a.ArticleType == ArticleType.News);
            }
            else if (normalizedMode is "all")
            {
                // leave query as-is
            }
            else
            {
                return BadRequest(new { message = "Invalid mode. Use mode=news or mode=all." });
            }

            var articleIds = articlesQuery.Select(a => a.Id);

            // Delete dependents first for safety (handles non-cascading FK setups).
            await _db.Likes.Where(l => articleIds.Contains(l.ArticleId)).ExecuteDeleteAsync(ct);
            await _db.ArticleImages.Where(i => articleIds.Contains(i.ArticleId)).ExecuteDeleteAsync(ct);

            await _db.CommentReports
                .Where(r => _db.Set<Comment>().Any(c => c.Id == r.CommentId && articleIds.Contains(c.ArticleId)))
                .ExecuteDeleteAsync(ct);

            await _db.Set<Comment>()
                .Where(c => articleIds.Contains(c.ArticleId))
                .ExecuteDeleteAsync(ct);

            var deletedArticles = await articlesQuery.ExecuteDeleteAsync(ct);

            _log.LogWarning("Purged {Count} articles (mode={Mode}).", deletedArticles, normalizedMode);
            return Ok(new { deletedArticles, mode = normalizedMode });
        }
    }
}

