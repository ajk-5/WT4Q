using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Interface;


namespace Northeast.Repository
{
        public class GenericRepository<T> : IRepository<T> where T : class
        {
            private readonly AppDbContext _context;
            private readonly DbSet<T> _dbSet;

            public GenericRepository(AppDbContext context)
            {
                _context = context;
                _dbSet = context.Set<T>();
            }

            public async Task<IEnumerable<T>> GetAll()
            {
                return await _dbSet.ToListAsync();
            }

            public async Task<T> GetById(int id)
        {
            var article = await _dbSet.FindAsync(id);
            return article;

        }
        public async Task<T> GetByGUId(Guid id)
        {
           var article= await _dbSet.FindAsync(id);
            return article;

        }

        public async Task Add(T entity)
            {
                await _dbSet.AddAsync(entity);
            await _context.SaveChangesAsync();
            }

            public async Task Update(T entity)
            {
                _dbSet.Update(entity);
            await _context.SaveChangesAsync();
             }

            public async Task Delete(T entity)
            {
                _dbSet.Remove(entity);
             await _context.SaveChangesAsync();
        }

    
    }

    
}
