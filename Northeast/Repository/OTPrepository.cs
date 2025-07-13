using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Repository
{
    public class OTPrepository : GenericRepository<OTP>
    {
        private readonly AppDbContext _context;

        public OTPrepository(AppDbContext context) : base(context)
        {
            _context = context;
        }
        public async Task<OTP> getOTPbyUserAndSixDigit(User user, string sixDigit)
        {
            try
            {

                var otp = await _context.OTPs.Where(o => o.UserId == user.Id && o.SixDigit == sixDigit)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
                return otp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching OTP: {ex.Message}");
                return null;
            }
        }
        public async Task<List<OTP>> getOTPbyUser(User user)
        {
            try
            {

              var otpList = await _context.OTPs
             .Where(o => o.UserId == user.Id) // Filter by User ID
             .OrderByDescending(o => o.CreatedAt) // Get latest OTPs first
             .ToListAsync(); // Convert query to list

                return otpList;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching OTP: {ex.Message}");
                return null;
            }
        }

    }
}
