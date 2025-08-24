using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class CocktailRepository : GenericRepository<Cocktail>
    {
        private readonly AppDbContext _context;
        public CocktailRepository(AppDbContext context) : base(context)
        {
            _context = context;
        }

        public Task<Cocktail?> GetBySlug(string slug) =>
            _context.Cocktails.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug);

        public async Task<IEnumerable<Cocktail>> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new List<Cocktail>();
            }
            query = query.ToLower();
            return await _context.Cocktails.AsNoTracking()
                .Where(c =>
                    c.Name.ToLower().Contains(query) ||
                    c.Content.ToLower().Contains(query) ||
                    c.Slug.ToLower().Contains(query))
                .ToListAsync();
        }
    }
}
