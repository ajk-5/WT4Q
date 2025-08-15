using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Services
{
    /// <summary>
    /// Resolves a SuperAdmin user to use as article author.
    /// </summary>
    public class AuthorResolver
    {
        private readonly AppDbContext _db;
        public AuthorResolver(AppDbContext db) => _db = db;

        public async Task<Guid> GetAuthorIdAsync(CancellationToken ct)
        {
            var user = await _db.Set<User>()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Role == Role.SuperAdmin || (int)u.Role == 2, ct);

            if (user == null)
                throw new InvalidOperationException("No SuperAdmin author found.");

            return user.Id;
        }
    }
}
