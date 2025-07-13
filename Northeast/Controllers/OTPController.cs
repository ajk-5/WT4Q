using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Northast.Services;
using Northeast.Models;
using Northeast.Repository;
using Northeast.Services;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OTPController : ControllerBase
    {
        private readonly OTPservices _oTPservices;
        private readonly UserRepository _userRepository;
        private readonly UserRegistration _userReg;
        private readonly SendEmail _sendMail;
        public OTPController(OTPservices oTPservices, UserRepository userRepository, SendEmail sendEmail, UserRegistration userReg)
        {
            _oTPservices = oTPservices;
            _userRepository = userRepository;
            _sendMail = sendEmail;
            _userReg = userReg;
        }

        [HttpGet("ForgotPassword")]
        public async Task<IActionResult> ForgetPassword(string Email)
        {
            try
            {
                if (Email == null)
                {
                    return BadRequest(new { message = "Please Enter email" });
                }
                var user = await _userRepository.GetUserByEmailAsync(Email);
                
                if (user == null)
                {
                    return NotFound(new { message = "No user associated with this email" });
                }
                await _oTPservices.DeleteOldUserOTPs(user);

                var otp = await _oTPservices.GetOTP(Email);
                if (otp == null)
                {
                    return BadRequest(new { message = "Not able to generate OTP" });
                }
                await _sendMail.SendPasswordResetAsync(Email, otp);
               
                return Ok(new { message = $"OTP send to {Email}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }


        }
        [HttpGet("VerifyEmail")]
        public async Task<IActionResult> VerifyEmail(string Email)
        {

            try
            {
                if (Email == null)
                {
                    return BadRequest(new { message = "Please Enter email" });
                }
                var user = await _userRepository.GetUserByEmailAsync(Email);

                if (user == null)
                {
                    return NotFound(new { message = "No user associated with this email" });
                }
                if (user.isVerified)
                {
                    return BadRequest(new { message = "Email already verified" });
                }

                await _oTPservices.DeleteOldUserOTPs(user); 
                var otp = await _oTPservices.GetOTP(Email);
                if (otp == null)
                {
                    return BadRequest(new { message = "Not able to generate OTP" });
                }
                string Subject = "VERIFY YOUR EMAIL";
                string Body = $"<strong>Dear {user.UserName},</strong><br>Your email verification OTP is <strong>{otp.SixDigit}</strong>. It expires at {otp.ValidUntil} UTC";
                await _sendMail.SendPersonalizedEmail(Email, Subject, Body);

                return Ok(new { message = $"OTP send to {Email}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }

        }
        [HttpPost("VerifyEmail")]
        public async Task<IActionResult> VerifyEmailOTPvalidation(string Email, string enteredotp)
        {

            try
            {
                if (Email == null)
                {
                    return BadRequest(new { message = "Please Enter email" });
                }
                var user = await _userRepository.GetUserByEmailAsync(Email);

                if (user == null)
                {
                    return NotFound(new { message = "No user associated with this email" });
                }
                if (user.isVerified)
                {
                    return BadRequest(new { message = "Email already verified" });
                }
                var otp = await _oTPservices.OTPbyEmailAndSixDigits(Email, enteredotp);

                if (otp == null)
                {
                    return BadRequest(new { message = "OTP did not match." });
                }

                if (!otp.IsValid)
                {
                    await _oTPservices.DeleteOTP(otp);
                    return BadRequest(new { message = "OTP is not valid." });
                    
                }
                user.isVerified = true;
                await _userRepository.Update(user);
                await _oTPservices.DeleteOTP(otp);
                return Ok(new { message = $"{Email} is verified" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }

        }
        [HttpPost("ForgotPassword")]
        public async Task<IActionResult> ChangePasswordOTPvalidation(string Email, string enteredotp, string Password, string ConfirmPassword)
        {

            try
            {
                if (Email == null)
                {
                    return BadRequest(new { message = "Please Enter email" });
                }
                if (Password == null)
                {
                    return BadRequest(new { message = "Please Enter new password" });
                }
                if (ConfirmPassword == null || ConfirmPassword!=Password)
                {
                    return BadRequest(new { message = "please enter same password" });
                }
                var user = await _userRepository.GetUserByEmailAsync(Email);

                if (user == null)
                {
                    return NotFound(new { message = "No user associated with this email" });
                }

                var otp = await _oTPservices.OTPbyEmailAndSixDigits(Email, enteredotp);

                if (otp == null)
                {
                    return BadRequest(new { message = "OTP did not match." });
                }

                if (!otp.IsValid)
                {
                    await _oTPservices.DeleteOTP(otp);
                    return BadRequest(new { message = "OTP is Expired" });
                }
                await _userReg.ChangePassword(user, Password);
                await _oTPservices.DeleteOTP(otp);
                return Ok(new { message = "password changed sucessfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }

        }
    }
}
