using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;
using System.Linq;

namespace Northeast.Repository
{
    public class CocktailRepository : GenericRepository<Cocktail>
    {
        private readonly AppDbContext _context;
        public CocktailRepository(AppDbContext context) : base(context)
        {
            _context = context;
        }

        private IQueryable<Cocktail> DetailedQuery()
        {
            return _context.Cocktails
                .AsNoTracking()
                .Include(c => c.IngredientQuantities)
                    .ThenInclude(iq => iq.Ingridient)
                .Include(c => c.Ingridients);
        }

        public new async Task<IEnumerable<Cocktail>> GetAll()
        {
            return await DetailedQuery().ToListAsync();
        }

        public new async Task<Cocktail?> GetById(int id)
        {
            return await DetailedQuery().FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<IEnumerable<Cocktail>> Search(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return new List<Cocktail>();
            }

            var tokens = query
                .Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => t.ToLowerInvariant())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .ToList();

            if (tokens.Count == 0)
            {
                return new List<Cocktail>();
            }

            IQueryable<Cocktail> q = DetailedQuery();
            foreach (var token in tokens)
            {
                var term = token;
                q = q.Where(c =>
                    c.Name.ToLower().Contains(term)
                    || c.Content.ToLower().Contains(term)
                    || c.IngredientQuantities.Any(iq => iq.Ingridient != null && iq.Ingridient.Name.ToLower().Contains(term))
                    || c.Ingridients.Any(i => i.Name != null && i.Name.ToLower().Contains(term)));
            }

            return await q.ToListAsync();
        }

        public async Task<IEnumerable<string>> SuggestIngredients(string term, int limit = 15)
        {
            if (string.IsNullOrWhiteSpace(term))
            {
                return new List<string>();
            }

            var normalized = term.Trim().ToLowerInvariant();

            var qtyNames = _context.Cocktails
                .AsNoTracking()
                .SelectMany(c => c.IngredientQuantities.Select(iq => iq.Ingridient.Name));

            var directNames = _context.Cocktails
                .AsNoTracking()
                .SelectMany(c => c.Ingridients.Select(i => i.Name));

            var names = await qtyNames
                .Concat(directNames)
                .Where(n => n != null && n.ToLower().Contains(normalized))
                .Distinct()
                .OrderBy(n => n)
                .Take(limit)
                .ToListAsync();

            return names;
        }
    }
}
