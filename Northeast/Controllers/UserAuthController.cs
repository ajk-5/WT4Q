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
using System.Text;
using Northeast.Repository;
using Northeast.Utilities;



namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/auth")]
    public class UserAuthController : ControllerBase
    {
        private readonly UserAuthentification _userAuth;
        private readonly IConfiguration _configuration;
        private readonly UserRepository _userRepository ;
        private readonly AppDbContext _db;
        private readonly GenerateJwt _generateJwt;

        public UserAuthController(IConfiguration configuration,UserRepository userRepository, UserAuthentification userAuth, AppDbContext db, GenerateJwt generateJwt)
        {
            _configuration = configuration;
            _userRepository = userRepository;
            _userAuth = userAuth;
            _db = db;
            _generateJwt = generateJwt;
        }

        private static string GenerateSecureToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToBase64String(bytes);
        }

        private static string HashToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes).ToLowerInvariant();
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


            if (user != null && token != null)
            {
                if (!user.isVerified)
                {
                    return StatusCode(403, new { message = "Account not verified", redirectTo = "/verify" }); ;

                }

                var accessExp = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]));
                var refreshRaw = GenerateSecureToken();
                var refreshExp = DateTime.UtcNow.AddDays(14);
                var refreshEntity = new RefreshToken
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    TokenHash = HashToken(refreshRaw),
                    ExpiresAtUtc = refreshExp,
                    CreatedAtUtc = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString()
                };

                await _db.RefreshTokens.AddAsync(refreshEntity);
                await _db.SaveChangesAsync();

                var secure = Request.IsHttps;
                var accessCookie = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = secure,
                    SameSite = SameSiteMode.Lax,
                    Path = "/",
                    Expires = accessExp
                };
                var refreshCookie = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = secure,
                    SameSite = SameSiteMode.Lax,
                    Path = "/",
                    Expires = refreshExp
                };

                Response.Cookies.Append("JwtToken", token, accessCookie);
                Response.Cookies.Append("RefreshToken", refreshRaw, refreshCookie);
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
                }
            }

            var refresh = Request.Cookies["RefreshToken"];
            if (!string.IsNullOrEmpty(refresh))
            {
                var hash = HashToken(refresh);
                var rt = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
                if (rt != null)
                {
                    rt.RevokedAtUtc = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();

            var secure = Request.IsHttps;
            var opts = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = SameSiteMode.Lax,
                Path = "/"
            };
            Response.Cookies.Delete("JwtToken", opts);
            Response.Cookies.Delete("RefreshToken", opts);
            return Ok(new { message = "Logged out" });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var raw = Request.Cookies["RefreshToken"];
            if (string.IsNullOrEmpty(raw)) return Unauthorized();

            var hash = HashToken(raw);
            var rt = await _db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash);
            if (rt == null || rt.RevokedAtUtc != null || rt.ExpiresAtUtc <= DateTime.UtcNow)
            {
                return Unauthorized();
            }

            var user = await _db.Users.FindAsync(rt.UserId);
            if (user == null) return Unauthorized();

            rt.RevokedAtUtc = DateTime.UtcNow;
            var newRaw = GenerateSecureToken();
            var newHash = HashToken(newRaw);
            var newRt = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = rt.UserId,
                TokenHash = newHash,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(14),
                CreatedAtUtc = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            };
            rt.ReplacedByTokenHash = newHash;
            await _db.RefreshTokens.AddAsync(newRt);

            var newAccess = _generateJwt.GenerateJwtToken(user);
            var idToken = new IdToken
            {
                UserId = user.Id,
                Token = newAccess,
                ExpiryDate = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };
            await _db.IdTokens.AddAsync(idToken);

            await _db.SaveChangesAsync();

            var secure = Request.IsHttps;
            var accessCookie = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = idToken.ExpiryDate
            };
            var refreshCookie = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = newRt.ExpiresAtUtc
            };

            Response.Cookies.Append("JwtToken", newAccess, accessCookie);
            Response.Cookies.Append("RefreshToken", newRaw, refreshCookie);
            return Ok();
        }


    }
}



