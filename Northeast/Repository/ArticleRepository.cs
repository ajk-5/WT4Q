using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;
using System.Linq;
using Northeast.DTOs;

namespace Northeast.Repository
{
    public class ArticleRepository: GenericRepository<Article>
    {
        private readonly AppDbContext _context;

        public ArticleRepository(AppDbContext context): base(context)
        {
            _context = context;
        }

        public Task<Article?> GetByIdAsync(Guid id) =>
            _context.Articles.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

        public Task<Article?> GetBySlugAsync(string slug) =>
            _context.Articles.AsNoTracking().FirstOrDefaultAsync(a => a.Slug == slug);

        public Task<List<Article>> GetAllExceptAsync(Guid excludeId) =>
            _context.Articles.AsNoTracking().Where(a => a.Id != excludeId).ToListAsync();
        public async Task<IEnumerable<Article>> GetAllByCategory(Category category) {
            var articles= await _context.Articles.AsNoTracking().Where(a => a.Category == category).ToListAsync();
            return articles;
        }

        public async Task<IEnumerable<Article>> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new List<Article>();
            }

            query = query.ToLower();

            return await _context.Articles.AsNoTracking()
                .Where(a =>
                    a.Title.ToLower().Contains(query) ||
                    a.Content.ToLower().Contains(query) ||
                    (a.CountryName != null && a.CountryName.ToLower().Contains(query)) ||
                    (a.CountryCode != null && a.CountryCode.ToLower().Contains(query)) ||
                    (a.Keywords != null && a.Keywords.Any(k => k.ToLower().Contains(query))))
                .ToListAsync();
        }

        public async Task<IEnumerable<Article>> Search(string? title, string? keyword, DateTime? date, ArticleType? type, Category? category)
        {
            var queryable = _context.Articles.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(title))
            {
                var lower = title.ToLower();
                queryable = queryable.Where(a => a.Title.ToLower().Contains(lower));
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kLower = keyword.ToLower();
                queryable = queryable.Where(a => a.Keywords != null && a.Keywords.Any(k => k.ToLower().Contains(kLower)));
            }

            if (date.HasValue)
            {
                var d = date.Value.Date;
                queryable = queryable.Where(a => a.CreatedDate.Date == d);
            }

            if (type.HasValue)
            {
                queryable = queryable.Where(a => a.ArticleType == type.Value);
            }

            if (category.HasValue)
            {
                queryable = queryable.Where(a => a.Category == category.Value);
            }

            return await queryable.ToListAsync();
        }

        public async Task<IEnumerable<Article>> SearchByArticleType(ArticleType type)
        {
            return await _context.Articles.AsNoTracking()
                .Where(a => a.ArticleType == type)
                .ToListAsync();
        }

        public async Task<IEnumerable<Article>> SearchByAuthor(Guid authorId)
        {
            return await _context.Articles.AsNoTracking()
                .Where(a => a.AuthorId == authorId)
                .ToListAsync();
        }

        public async Task<PagedResult<Article>> SearchPagedAsync(SearchQueryDto q)
        {
            var queryable = _context.Articles.AsNoTracking().AsQueryable();

            // Time range
            if (q.From.HasValue)
            {
                var from = q.From.Value.Date;
                queryable = queryable.Where(a => a.CreatedDate >= from);
            }
            if (q.To.HasValue)
            {
                var to = q.To.Value.Date.AddDays(1).AddTicks(-1);
                queryable = queryable.Where(a => a.CreatedDate <= to);
            }

            // Broad query (applies across several fields)
            if (!string.IsNullOrWhiteSpace(q.Q))
            {
                var ql = q.Q.ToLower();
                queryable = queryable.Where(a =>
                    a.Title.ToLower().Contains(ql)
                    || a.Content.ToLower().Contains(ql)
                    || (a.CountryName != null && a.CountryName.ToLower().Contains(ql))
                    || (a.CountryCode != null && a.CountryCode.ToLower().Contains(ql))
                    || (a.Keywords != null && a.Keywords.Any(k => k.ToLower().Contains(ql))));
            }

            // Field-specific filters
            if (!string.IsNullOrWhiteSpace(q.Title))
            {
                var t = q.Title.ToLower();
                queryable = queryable.Where(a => a.Title.ToLower().Contains(t));
            }
            if (!string.IsNullOrWhiteSpace(q.Keyword))
            {
                var k = q.Keyword.ToLower();
                queryable = queryable.Where(a => a.Keywords != null && a.Keywords.Any(x => x.ToLower().Contains(k)));
            }
            if (!string.IsNullOrWhiteSpace(q.CountryName))
            {
                var cn = q.CountryName.ToLower();
                queryable = queryable.Where(a => a.CountryName != null && a.CountryName.ToLower().Contains(cn));
            }
            if (!string.IsNullOrWhiteSpace(q.CountryCode))
            {
                var cc = q.CountryCode.ToLower();
                queryable = queryable.Where(a => a.CountryCode != null && a.CountryCode.ToLower().Contains(cc));
            }
            if (q.Type.HasValue)
            {
                queryable = queryable.Where(a => a.ArticleType == q.Type.Value);
            }
            if (q.Category.HasValue)
            {
                queryable = queryable.Where(a => a.Category == q.Category.Value);
            }
            if (q.IsBreaking.HasValue)
            {
                queryable = queryable.Where(a => a.IsBreakingNews == q.IsBreaking.Value);
            }
            if (q.HasImages.HasValue)
            {
                if (q.HasImages.Value)
                    queryable = queryable.Where(a => a.Images != null && a.Images.Count > 0);
                else
                    queryable = queryable.Where(a => a.Images == null || a.Images.Count == 0);
            }

            // Sorting
            var sort = (q.Sort ?? "date_desc").ToLowerInvariant();
            if (sort == "date_asc")
            {
                queryable = queryable.OrderBy(a => a.CreatedDate);
            }
            else if (sort == "relevance" && !string.IsNullOrWhiteSpace(q.Q))
            {
                var ql = q.Q!.ToLower();
                queryable = queryable
                    .OrderByDescending(a => (a.Title.ToLower().Contains(ql) ? 3 : 0)
                                           + (a.Keywords != null && a.Keywords.Any(k => k.ToLower().Contains(ql)) ? 2 : 0)
                                           + (a.Content.ToLower().Contains(ql) ? 1 : 0))
                    .ThenByDescending(a => a.CreatedDate);
            }
            else
            {
                queryable = queryable.OrderByDescending(a => a.CreatedDate);
            }

            // Paging
            var page = q.Page < 1 ? 1 : q.Page;
            var size = q.PageSize <= 0 ? 20 : q.PageSize;

            var total = await queryable.CountAsync();
            var items = await queryable.Skip((page - 1) * size).Take(size).ToListAsync();

            return new PagedResult<Article>
            {
                Page = page,
                PageSize = size,
                Total = total,
                Items = items
            };
        }

        public async Task<IEnumerable<Article>> Filter(Guid? id, string? title, string? content,
            DateTime? date, ArticleType? type, Category? category, Guid? authorId,
            string? countryName, string? countryCode, string? keyword)
        {
            var queryable = _context.Articles.AsNoTracking().AsQueryable();

            if (id.HasValue)
            {
                queryable = queryable.Where(a => a.Id == id.Value);
            }

            if (!string.IsNullOrWhiteSpace(title))
            {
                var lower = title.ToLower();
                queryable = queryable.Where(a => a.Title.ToLower().Contains(lower));
            }

            if (!string.IsNullOrWhiteSpace(content))
            {
                var lower = content.ToLower();
                queryable = queryable.Where(a => a.Content.ToLower().Contains(lower));
            }

            if (date.HasValue)
            {
                var d = date.Value.Date;
                queryable = queryable.Where(a => a.CreatedDate.Date == d);
            }

            if (type.HasValue)
            {
                queryable = queryable.Where(a => a.ArticleType == type.Value);
            }

            if (category.HasValue)
            {
                queryable = queryable.Where(a => a.Category == category.Value);
            }

            if (authorId.HasValue)
            {
                queryable = queryable.Where(a => a.AuthorId == authorId.Value);
            }

            if (!string.IsNullOrWhiteSpace(countryName))
            {
                var lower = countryName.ToLower();
                queryable = queryable.Where(a => a.CountryName != null && a.CountryName.ToLower().Contains(lower));
            }

            if (!string.IsNullOrWhiteSpace(countryCode))
            {
                var lower = countryCode.ToLower();
                queryable = queryable.Where(a => a.CountryCode != null && a.CountryCode.ToLower().Contains(lower));
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var lower = keyword.ToLower();
                queryable = queryable.Where(a => a.Keywords != null && a.Keywords.Any(k => k.ToLower().Contains(lower)));
            }

            return await queryable.ToListAsync();
        }

        public async Task<IEnumerable<Article>> GetRecommendedArticles(Guid articleId, int count = 5)
        {
            var source = await _context.Articles.AsNoTracking().FirstOrDefaultAsync(a => a.Id == articleId);
            if (source == null)
            {
                return new List<Article>();
            }

            var candidates = await _context.Articles.AsNoTracking()
                .Where(a => a.Id != articleId)
                .ToListAsync();

            var scored = candidates
                .Select(a => new
                {
                    Article = a,
                    Score = CalculateSimilarity(source, a)
                })
                .OrderByDescending(x => x.Score)
                .Take(count)
                .Select(x => x.Article)
                .ToList();

            return scored;
        }

        public async Task<IEnumerable<Article>> GetBreakingNews()
        {
            var cutoff = DateTime.UtcNow.AddDays(-3);

            // find any breaking news older than the cutoff and flip the flag
            var expired = await _context.Articles
                .Where(a => a.ArticleType == ArticleType.News && a.IsBreakingNews && a.CreatedDate < cutoff)
                .ToListAsync();

            if (expired.Count > 0)
            {
                foreach (var article in expired)
                {
                    article.IsBreakingNews = false;
                }

                await _context.SaveChangesAsync();
            }

            // return most recent breaking news, limited to 20 articles
            return await _context.Articles.AsNoTracking()
                .Where(a => a.ArticleType == ArticleType.News && a.IsBreakingNews && a.CreatedDate >= cutoff)
                .OrderByDescending(a => a.CreatedDate)
                .Take(20)
                .ToListAsync();
        }

        public async Task<IEnumerable<Article>> GetTrendingArticles(DateTime cutoff)
        {
            return await _context.Articles.AsNoTracking()
                .Include(a => a.Like)
                .Include(a => a.Comments)
                .Where(a => a.CreatedDate >= cutoff)
                .ToListAsync();
        }

        public async Task<IEnumerable<Article>> GetRecentArticlesUsingProcedure(int limit)
        {
            return await _context.Articles
                .FromSqlRaw("SELECT * FROM get_recent_articles({0})", limit)
                .AsNoTracking()
                .ToListAsync();
        }

        private static double CalculateSimilarity(Article a, Article b)
        {
            double score = 0;

            if (a.Category == b.Category)
            {
                score += 1.0;
            }

            if (a.ArticleType == b.ArticleType)
            {
                score += 0.5;
            }

            var tokensA = CollectTokens(a);
            var tokensB = CollectTokens(b);

            var intersection = tokensA.Intersect(tokensB).Count();
            var union = tokensA.Union(tokensB).Count();

            if (union > 0)
            {
                score += (double)intersection / union;
            }

            return score;
        }

        private static HashSet<string> CollectTokens(Article article)
        {
            var tokens = new HashSet<string>();

            if (!string.IsNullOrWhiteSpace(article.Title))
            {
                foreach (var t in Tokenize(article.Title))
                {
                    tokens.Add(t);
                }
            }

            if (!string.IsNullOrWhiteSpace(article.Content))
            {
                foreach (var t in Tokenize(article.Content))
                {
                    tokens.Add(t);
                }
            }

            if (article.Keywords != null)
            {
                foreach (var k in article.Keywords)
                {
                    var t = k.ToLower();
                    if (!string.IsNullOrWhiteSpace(t))
                    {
                        tokens.Add(t);
                    }
                }
            }

            return tokens;
        }

        private static IEnumerable<string> Tokenize(string text)
        {
            return text
                .ToLower()
                .Split(new[] { ' ', '\t', '\n', '\r', ',', '.', ';', ':', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
        }


    }
}
