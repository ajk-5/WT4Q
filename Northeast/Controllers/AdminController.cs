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
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };

            Response.Cookies.Append("JwtToken", token, cookieOptions);

            return Ok(new { response = token });

        }

        [HttpPost("Adminlogout")]
        public IActionResult AdminLogout()
        {
            if (Request.Cookies.ContainsKey("JwtToken"))
            {
                Response.Cookies.Delete("JwtToken", new CookieOptions
                {
                    Secure = Request.IsHttps,
                    SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax
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
