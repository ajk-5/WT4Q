using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class CommentReportRepository : GenericRepository<CommentReport>
    {
        private readonly AppDbContext _context;

        public CommentReportRepository(AppDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<CommentReport?> GetByUserAndComment(Guid userId, Guid commentId)
        {
            return await _context.CommentReports.FirstOrDefaultAsync(r => r.UserId == userId && r.CommentId == commentId);
        }
    }
}
