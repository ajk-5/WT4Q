using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class LoginHistoryRepository : GenericRepository<LoginHistory>
    {
        private readonly AppDbContext _context;
        public LoginHistoryRepository(AppDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<LoginHistory?> GetRecentForUser(Guid userId, string ip, int minutes)
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-minutes);
            return await _context.LoginHistories
                .Where(l => l.UserId == userId && l.IpAddress == ip && l.LoginTime >= cutoff)
                .OrderByDescending(l => l.LoginTime)
                .FirstOrDefaultAsync();
        }
    }
}
