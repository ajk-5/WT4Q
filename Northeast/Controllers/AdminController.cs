using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Northeast.DTOs;
using Northeast.Services;
using Northeast.Data;
using Northeast.Utilities;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
      
        private readonly AdminAuthentification _auth;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;
        private readonly AppDbContext _context;
        private readonly GetConnectedUser _connectedUser;

        public AdminController(AdminAuthentification auth, IConfiguration configuration, IWebHostEnvironment env, AppDbContext context, GetConnectedUser connectedUser)
        {
            _auth = auth;
            _configuration = configuration;
            _env = env;
            _context = context;
            _connectedUser = connectedUser;
        }
        [HttpPost("Adminlogin")]
        public async Task<IActionResult> AdminLogin([FromBody] AdminLoginDTO costumer)
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

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid login attempt" });

            }
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true, // Prevents JavaScript access
                Secure = true,   // Required when SameSite=None
                SameSite = SameSiteMode.None, // allows cross-site cookies; use Strict/Lax to mitigate CSRF
                Expires = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };

            Response.Cookies.Append("AdminToken", token, cookieOptions);

            return Ok(new { response = token });

        }

        [HttpPost("Adminlogout")]
        public IActionResult AdminLogout()
        {
            if (Request.Cookies.ContainsKey("AdminToken"))
            {
                Response.Cookies.Delete("AdminToken", new CookieOptions
                {
                    Secure = true,
                    SameSite = SameSiteMode.None
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

            var admin = await _context.Admins.FirstOrDefaultAsync(a => a.Id == id);
            if (admin == null)
            {
                return NotFound(new { message = "Admin not found" });
            }

            return Ok(new { id = admin.Id, adminName = admin.AdminName, email = admin.Email });
        }

    }
}
