using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;
using System.Linq;

namespace Northeast.Repository
{
    public class ArticleRepository: GenericRepository<Article>
    {
        private readonly AppDbContext _context;

        public ArticleRepository(AppDbContext context): base(context)
        {
            _context = context;
        }
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
                    a.Description.ToLower().Contains(query) ||
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

        public async Task<IEnumerable<Article>> Filter(Guid? id, string? title, string? description,
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

            if (!string.IsNullOrWhiteSpace(description))
            {
                var lower = description.ToLower();
                queryable = queryable.Where(a => a.Description.ToLower().Contains(lower));
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
            return await _context.Articles.AsNoTracking()
                .Where(a => a.ArticleType == ArticleType.News && a.IsBreakingNews && a.CreatedDate >= cutoff)
                .OrderByDescending(a => a.CreatedDate)
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

            if (!string.IsNullOrWhiteSpace(article.Description))
            {
                foreach (var t in Tokenize(article.Description))
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
