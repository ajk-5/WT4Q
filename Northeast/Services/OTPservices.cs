using NavXpert.Utilities;
using Northast.Services;
using Northeast.Models;
using Northeast.Repository;

namespace Northeast.Services
{
    public class OTPservices
    {
        private readonly OTPrepository _oTPrepository;
        private readonly UserRepository _userRepository;

        public OTPservices(OTPrepository oTPrepository, UserRepository userRepository)
        {
            _oTPrepository = oTPrepository;
            _userRepository = userRepository;

        }

        public async Task<OTP> GetOTP(string Email)
        {
            var user = await _userRepository.GetUserByEmailAsync(Email);

            if (user == null)
            {
                return null;
            }
            
            string sixDigit = GenerateOTP.GenerateOtp();
            if (string.IsNullOrEmpty(sixDigit))
            {
                return null;
            }
            OTP otp = new OTP
            {
                Id = new int(),
                SixDigit = sixDigit,
                CreatedAt = DateTime.UtcNow,
                ValidUntil = DateTime.UtcNow.AddMinutes(15),
                IsValid = true,
                User = user,
                UserId = user.Id,

            };
            await _oTPrepository.Add(otp);
            return otp;

        }
        public async Task DevalidateOTP(OTP otp)
        {
            otp.IsValid = false;

            await _oTPrepository.Update(otp);

        }
        public async Task<OTP> OTPbyEmailAndSixDigits(string email, string sixDigit)
        {
            var user = await _userRepository.GetUserByEmailAsync(email);
            if (user == null)
            {
                return null;
            }
            return await _oTPrepository.getOTPbyUserAndSixDigit(user, sixDigit); ;
        }

        public async Task DeleteOTP(OTP otp)
        {
            if (otp == null || otp.IsValid)
            {
                return;
            }
            await _oTPrepository.Delete(otp);
        }
        public async Task DeleteOldUserOTPs(User user) { 
            if (user == null)
            {
                return;
            }
            var otplist =await _oTPrepository.getOTPbyUser(user);
            if (otplist==null || otplist.Count == 0)
            {
                return;
            }
            foreach (var otp in otplist)
            {
                await _oTPrepository.Delete(otp);
            }
            return;
        }

    }
}
