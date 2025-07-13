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
    }
}
