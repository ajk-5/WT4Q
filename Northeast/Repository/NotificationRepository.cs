using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class NotificationRepository : GenericRepository<Notification>
    {
        public NotificationRepository(AppDbContext context) : base(context)
        {
        }
    }
}

