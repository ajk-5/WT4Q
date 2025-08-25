using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class LikeRepository:GenericRepository<LikeEntity>
    {
        private readonly AppDbContext _context;

        public LikeRepository(AppDbContext context):base(context) { 
            _context = context;
        }

        public Task<LikeEntity?> GetLikeByUserAndArticle(Guid userId, Guid articleId) =>
            _context.Likes.FirstOrDefaultAsync(l => l.UserId == userId && l.ArticleId == articleId);

        public async Task<bool> UserAlreadyLiked(Guid userId, Guid articleId)
        {
            return await _context.Likes
                .AnyAsync(l => l.UserId == userId && l.ArticleId == articleId);
        }

    }


}
