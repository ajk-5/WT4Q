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

        public async Task<LikeEntity?> GetLikeByUserAndArticle(Guid UserId, Guid ArticleId) {
            var liked = await UserAlreadyLiked(UserId, ArticleId);
            if (liked) {
                var like = await _context.Likes
       .FirstOrDefaultAsync(l => l.UserId == UserId && l.ArticleId == ArticleId);
                return like;
            }
            return null;
        }

        public async Task<bool> UserAlreadyLiked(Guid userId, Guid articleId)
        {
            return await _context.Likes
                .AnyAsync(l => l.UserId == userId && l.ArticleId == articleId);
        }

    }


}
