using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Northeast.DTOs;
using Northeast.Services;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
      
        private readonly AdminAuthentification _auth;
        private readonly IConfiguration _configuration;

        public AdminController(AdminAuthentification auth, IConfiguration configuration)
        {

            _auth = auth;
            _configuration = configuration;
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
                Secure = true,   // Ensures the cookie is sent only over HTTPS
                SameSite = SameSiteMode.None, // allows cross-site cookies; use Strict/Lax to mitigate CSRF
                Expires = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };

            Response.Cookies.Append("AdminToken", token, cookieOptions);

            return Ok(new { response = token });

        }

    }
}
