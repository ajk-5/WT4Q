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


    }
}
