using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Services
{
    /// <summary>
    /// Resolves an admin-level user to use as article author.
    /// Prefers SuperAdmin, falls back to Admin.
    /// </summary>
    public class AuthorResolver
    {
        private readonly AppDbContext _db;
        public AuthorResolver(AppDbContext db) => _db = db;

        public async Task<Guid> GetAuthorIdAsync(CancellationToken ct)
        {
            var user = await _db.Set<User>()
                .AsNoTracking()
                .Where(u => u.Role == Role.SuperAdmin || u.Role == Role.Admin)
                .OrderByDescending(u => u.Role == Role.SuperAdmin)
                .FirstOrDefaultAsync(ct);

            if (user == null)
                throw new InvalidOperationException("No Admin or SuperAdmin author found.");

            return user.Id;
        }
    }
}
