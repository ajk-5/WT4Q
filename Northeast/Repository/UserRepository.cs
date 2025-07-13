using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class UserRepository : GenericRepository<User>
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context):base (context)
        {
            _context = context;
        }

        
        public async Task<User> GetUserByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }
    }
}
