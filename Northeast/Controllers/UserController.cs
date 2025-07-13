using Microsoft.AspNetCore.Mvc;
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
        public ActionResult<User> getUserByEmail([FromBody] UserLoginDTO user)  { 
            return Ok(User);
        
        }

        

    }
}
