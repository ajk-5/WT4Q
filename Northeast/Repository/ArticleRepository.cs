using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

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


    }
}
