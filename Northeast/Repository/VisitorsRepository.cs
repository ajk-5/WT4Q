using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class VisitorsRepository:GenericRepository<Visitors>
    {
        private readonly AppDbContext _appDbContext;
        public VisitorsRepository(AppDbContext appDbContext):base(appDbContext)
        {
            _appDbContext = appDbContext;
        }

        public async Task<Visitors?> GetByUserIdAsync(Guid userId)
        {
            return await _appDbContext.Visitors.FirstOrDefaultAsync(v => v.UserId == userId);
        }

        public async Task<Visitors?> GetGuestByIpAsync(string ip)
        {
            return await _appDbContext.Visitors.FirstOrDefaultAsync(v => v.IsGuest && v.IpAddress == ip);
        }
    }
}
