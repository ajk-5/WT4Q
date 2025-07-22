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

        public async Task<IEnumerable<Cocktail>> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new List<Cocktail>();
            }
            query = query.ToLower();
            return await _context.Cocktails.AsNoTracking()
                .Where(c => c.Name.ToLower().Contains(query) || c.description.ToLower().Contains(query))
                .ToListAsync();
        }
    }
}
