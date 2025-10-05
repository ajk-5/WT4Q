using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Northeast.DTOs;
using Northeast.Services;
using Northeast.Data;
using Northeast.Models;
using Northeast.Utilities;
using System.Security.Cryptography;
using System.Text;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
      
        private readonly UserAuthentification _auth;
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private readonly GetConnectedUser _connectedUser;
        private readonly ILogger<AdminController> _logger;

        public AdminController(UserAuthentification auth, IConfiguration configuration, AppDbContext context, GetConnectedUser connectedUser, ILogger<AdminController> logger)
        {
            _auth = auth;
            _configuration = configuration;
            _context = context;
            _connectedUser = connectedUser;
            _logger = logger;
        }
        [HttpPost("Adminlogin")]
        public async Task<IActionResult> AdminLogin([FromBody] UserLoginDTO costumer)
        {
            if (string.IsNullOrEmpty(costumer.Email))
            {
                return BadRequest(new { message = "Email required." });
            }
            if (string.IsNullOrEmpty(costumer.Password))
            {
                return BadRequest(new { message = "password required." });
            }

            var (user, token) = await _auth.Login(costumer.Email, costumer.Password);

            if (user == null || (user.Role != Role.Admin && user.Role != Role.SuperAdmin))
            {
                return Unauthorized(new { message = "Invalid login attempt" });

            }
            // Access token cookie (HttpOnly, cross-site)
            var accessExp = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
                ;
            var accessCookie = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = accessExp,
                Domain = ".90stimes.com"
            };
            Response.Cookies.Append("JwtToken", token, accessCookie);

            // Also issue a RefreshToken cookie so the frontend's generic refresh flow works for admins
            string GenerateSecureToken()
            {
                var bytes = RandomNumberGenerator.GetBytes(32);
                return Convert.ToBase64String(bytes);
            }
            string HashToken(string raw)
            {
                var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
                return Convert.ToHexString(bytes).ToLowerInvariant();
            }

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
            await _context.RefreshTokens.AddAsync(refreshEntity);
            await _context.SaveChangesAsync();

            var refreshCookie = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = refreshExp,
                Domain = ".90stimes.com"
            };
            Response.Cookies.Append("RefreshToken", refreshRaw, refreshCookie);

            return Ok(new { response = token });

        }

        [HttpPost("Adminlogout")]
        public IActionResult AdminLogout()
        {
            if (Request.Cookies.ContainsKey("JwtToken"))
            {
                Response.Cookies.Delete("JwtToken", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Path = "/",
                    Domain = ".90stimes.com"
                });
            }
            if (Request.Cookies.ContainsKey("RefreshToken"))
            {
                Response.Cookies.Delete("RefreshToken", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Path = "/",
                    Domain = ".90stimes.com"
                });
            }

            return Ok(new { message = "logged out successfully" });

        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentAdmin()
        {
            var id = _connectedUser.Id;
            if (id == Guid.Empty)
            {
                return Unauthorized(new { message = "Not logged in" });
            }

            var admin = await _context.Users.FirstOrDefaultAsync(a => a.Id == id && (a.Role == Role.Admin || a.Role == Role.SuperAdmin));
            if (admin == null)
            {
                return NotFound(new { message = "Admin not found" });
            }

            var roleString = admin.Role.ToString();

            return Ok(new
            {
                id = admin.Id,
                adminName = admin.UserName,
                email = admin.Email,
                role = roleString,
                roles = new[] { roleString },
                isAdmin = admin.Role == Role.Admin || admin.Role == Role.SuperAdmin,
                isSuperAdmin = admin.Role == Role.SuperAdmin
            });
        }

        [Authorize(Policy = "SuperAdminOnly")]
        [HttpPost("approve/{id}")]
        public async Task<IActionResult> ApproveAdmin(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.Role = Role.Admin;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {SuperAdmin} approved admin {User}", _connectedUser.Id, id);

            return Ok(new { message = "Admin approved" });
        }

    }
}
