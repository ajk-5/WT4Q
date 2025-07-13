using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Northeast.Data;
using Northeast.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Northeast.Services
{
    public class AdminAuthentification
    {
        private readonly AppDbContext _appDbContext;

        private readonly IConfiguration _configuration;


        public AdminAuthentification(AppDbContext appDbContext, IConfiguration configuration)
        {
            _appDbContext = appDbContext;
            _configuration = configuration;
        }
        public async Task<(Admin user, string token)> Login(string email, string password)
        {
            // Retrieve user from database
            var user = await _appDbContext.Admins.FirstOrDefaultAsync(u => u.Email == email);

            // Return null if user not found or password verification fails
            if (user == null)
            {
                Console.WriteLine("failed");
                return (null, null);

            }
            if (!BCrypt.Net.BCrypt.Verify(password,user.Password))
            {
                Console.WriteLine("failed password");
                return (null, null);
            }

            // Generate the JWT token
            var token = GenerateJwtToken(user);

            // Create IdToken object to store in the database
            var userToken = new IdToken
            {
                UserId = user.Id,
                Token = token,
                ExpiryDate = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };

            // Store the token in the database (asynchronously)
            await _appDbContext.IdTokens.AddAsync(userToken);
            await _appDbContext.SaveChangesAsync();

            // Return user and token in a tuple
            return (user, token);
        }


        private string GenerateJwtToken(Admin user)
        {
            var securityKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, user.AdminName),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, "admin")


        };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"])),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

