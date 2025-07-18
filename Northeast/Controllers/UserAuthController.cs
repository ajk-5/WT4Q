using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using Northeast.Repository;



namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserAuthController : ControllerBase
    {
        private readonly UserAuthentification _userAuth;
        private readonly IConfiguration _configuration;
        private readonly UserRepository _userRepository ;

        public UserAuthController(IConfiguration configuration,UserRepository userRepository, UserAuthentification userAuth)
        {
            _configuration = configuration;
            _userRepository = userRepository;
            _userAuth = userAuth;
        }

        [HttpPost("login")]
        public async Task<IActionResult> UserLogin([FromBody] UserLoginDTO loginDto)
        {
            var userEmail =  await _userRepository.GetUserByEmailAsync(loginDto.Email);

            if (userEmail == null)
            {
                return NotFound(new { message = $"User with this {loginDto.Email} not found" }); 
            }

            var (user, token) = await _userAuth.Login(loginDto.Email, loginDto.Password);


            if (user != null || token!=null)
            {
                if (!user.isVerified)
                {
                    return StatusCode(403, new { message = "Account not verified", redirectTo = "/verify" }); ;

                }

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true, // Prevents JavaScript access
                    Secure = true,   // Ensures the cookie is sent only over HTTPS
                    SameSite = SameSiteMode.Strict, // Prevents CSRF attacks
                    Expires = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
                };

                Response.Cookies.Append("JwtToken", token, cookieOptions);
                return Ok(new {message= "logged in successfully" });
            }
            return Unauthorized(new { message = "opps! unable to log in " });
        }

   
    }
}



