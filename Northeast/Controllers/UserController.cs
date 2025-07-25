using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Utilities;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _appDbContext;
        private readonly GetConnectedUser _connectedUser;

        public UserController(AppDbContext appDbContext, GetConnectedUser connectedUser)
        {
            _appDbContext = appDbContext;
            _connectedUser = connectedUser;
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

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<User>> GetCurrentUser()
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "Not logged in" });
            }

            var user = await _appDbContext.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }
            return Ok(user);
        }

        [Authorize]
        [HttpPut]
        public async Task<IActionResult> UpdateCurrentUser([FromBody] UserUpdateDTO dto)
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "Not logged in" });
            }

            var user = await _appDbContext.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (dto.UserName != null) user.UserName = dto.UserName;
            if (dto.PhoneNumber != null) user.Phone = dto.PhoneNumber;
            if (dto.DOB != null) user.DOB = dto.DOB;

            await _appDbContext.SaveChangesAsync();
            return Ok(new { message = "Profile updated" });
        }

        [Authorize]
        [HttpDelete]
        public async Task<IActionResult> DeleteCurrentUser([FromBody] DeleteAccountDTO dto)
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "Not logged in" });
            }

            var user = await _appDbContext.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
            {
                return BadRequest(new { message = "Invalid password" });
            }

            var tokens = _appDbContext.IdTokens.Where(t => t.UserId == userId);
            _appDbContext.IdTokens.RemoveRange(tokens);
            _appDbContext.Users.Remove(user);
            await _appDbContext.SaveChangesAsync();
            Response.Cookies.Delete("JwtToken");
            return Ok(new { message = "Account deleted" });
        }

        [Authorize]
        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity()
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "Not logged in" });
            }

            var comments = await _appDbContext.Set<Comment>()
                .Include(c => c.Article)
                .Where(c => c.Writer.Id == userId)
                .Select(c => new
                {
                    id = c.Id,
                    articleId = c.ArticleId,
                    articleTitle = c.Article.Title,
                    content = c.Content,
                    createdAt = c.CreatedAt
                })
                .ToListAsync();

            var likes = await _appDbContext.Set<LikeEntity>()
                .Include(l => l.Article)
                .Where(l => l.UserId == userId)
                .Select(l => new
                {
                    id = l.Id,
                    articleId = l.ArticleId,
                    articleTitle = l.Article.Title,
                    type = l.Type
                })
                .ToListAsync();

            return Ok(new { comments, likes });
        }

        

    }
}
