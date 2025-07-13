using System.Security.Cryptography;

namespace NavXpert.Utilities
{
    public static class GenerateOTP
    {
        public static string GenerateOtp()
        {
            var randomNumber = new byte[4];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
            }
            int otp = Math.Abs(BitConverter.ToInt32(randomNumber, 0)) % 1000000;
            return otp.ToString("D6");  // Ensure it's always 6 digits
        }
    }
}
