using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Northeast.Services;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Services;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserRegistrationController : ControllerBase
    {
        private readonly UserRegistration _userReg;
        private readonly OTPservices _oTPservices;
        private readonly SendEmail _sendMail;
        public UserRegistrationController(UserRegistration  UserReg, OTPservices oTPservices, SendEmail sendEmail) { 
        _userReg = UserReg;
            _oTPservices = oTPservices;
            _sendMail = sendEmail;
        }

        [HttpPost]
        public async Task<IActionResult> Register([FromBody] UserRegisterDTO userRegisterDTO) {
            if (!ModelState.IsValid)
            {
                return BadRequest(new {message="please fill in all the required" });
            }
            if(await _userReg.userExists(userRegisterDTO.Email))
            {
                return BadRequest(new { message = "User already exists" });
            }

            try
            {
                var newUser = await _userReg.Register(
                    userRegisterDTO.Username,
                    userRegisterDTO.Email,
                    userRegisterDTO.Password,
                    userRegisterDTO.ConfirmPassword
                );
                var otp = await _oTPservices.GetOTP(userRegisterDTO.Email);
                if (otp == null)
                {
                    return BadRequest(new { message = "Not able to generate OTP" });
                }
                string Subject = "VERIFY YOUR EMAIL";
                string Body = $"<strong>Dear {userRegisterDTO.Username},</strong><br>Your email verification OTP is <strong>{otp.SixDigit}</strong>. It expires at {otp.ValidUntil} UTC";
                await _sendMail.SendPersonalizedEmail(userRegisterDTO.Email, Subject, Body);
                return Ok(new { Message = "Registration successful.", User = newUser });
            }
            catch (ArgumentException ex)
            {
                // Handle validation errors
                return BadRequest(new { Error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // Handle business logic errors
                return Conflict(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                // Handle unexpected errors
                return StatusCode(500, new { message = "An unexpected error occurred."+ex.Message });
            }
        }
        

    }
}
