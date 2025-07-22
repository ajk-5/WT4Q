using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
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
        private readonly AppDbContext _db;

        public UserAuthController(IConfiguration configuration,UserRepository userRepository, UserAuthentification userAuth, AppDbContext db)
        {
            _configuration = configuration;
            _userRepository = userRepository;
            _userAuth = userAuth;
            _db = db;
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
                    Secure = true,   // Required when SameSite=None
                    SameSite = SameSiteMode.None, // allows cross-site cookies; use Strict/Lax to mitigate CSRF
                    Expires = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
                };

                Response.Cookies.Append("JwtToken", token, cookieOptions);
                return Ok(new {message= "logged in successfully" });
            }
            return Unauthorized(new { message = "opps! unable to log in " });
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var token = Request.Cookies["JwtToken"];
            if (!string.IsNullOrEmpty(token))
            {
                var stored = await _db.IdTokens.FirstOrDefaultAsync(t => t.Token == token);
                if (stored != null)
                {
                    stored.IsRevoked = true;
                    await _db.SaveChangesAsync();
                }
            }
            Response.Cookies.Delete("JwtToken");
            return Ok(new { message = "Logged out" });
        }

   
    }
}



