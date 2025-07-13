using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class CommentRepository: GenericRepository<Comment>
    {
        private readonly AppDbContext   _appDbContext;

        public CommentRepository(AppDbContext appDbContext):base(appDbContext)
        {
            _appDbContext = appDbContext;
        }
    }
}
