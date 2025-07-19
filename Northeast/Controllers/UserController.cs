using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;


        public UserController(AppDbContext appDbContext) { 
        _appDbContext = appDbContext;
        }
        
        [HttpGet]
        public ActionResult<User> getAllUser() {
            if (_appDbContext.Users == null) {
                return NotFound("ahh no users yet");
            }
            return Ok(_appDbContext.Users);

        }
        [HttpGet("{email}")]
        public async Task<ActionResult<User>> getUserByEmail(string email)  {
            if (string.IsNullOrWhiteSpace(email)) {
                return BadRequest(new { message = "Email parameter is required" });
            }

            var user = await _appDbContext.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null) {
                return NotFound(new { message = $"User with email {email} not found" });
            }

            return Ok(user);

        }

        

    }
}
