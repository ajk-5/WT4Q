using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class PageVisitRepository : GenericRepository<PageVisit>
    {
        private readonly AppDbContext _context;
        public PageVisitRepository(AppDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<PageVisit?> GetRecentVisit(int visitorId, string pageUrl, int minutes)
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-minutes);
            return await _context.PageVisits
                .Where(p => p.VisitorId == visitorId && p.PageUrl == pageUrl && p.VisitTime >= cutoff)
                .OrderByDescending(p => p.VisitTime)
                .FirstOrDefaultAsync();
        }

        public Task<int> CountVisitsAsync(string pageUrl)
        {
            return _context.PageVisits.CountAsync(p => p.PageUrl == pageUrl);
        }
    }
}
