using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Northeast.Data;
using Northeast.Models;
using Northeast.Utilities;
using Northeast.Repository;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;


namespace Northeast.Services
{
    public class UserAuthentification
    {

        private readonly AppDbContext _appDbContext;
        private readonly IConfiguration _configuration;
        private readonly GenerateJwt _generateJwt;
        private readonly GetConnectedUser _connectedUser;
        private readonly LoginHistoryRepository _loginHistoryRepository;

        public UserAuthentification(AppDbContext appDbContext,IConfiguration configuration, GenerateJwt generateJwt, GetConnectedUser connectedUser, LoginHistoryRepository loginHistoryRepository)
        {
            _appDbContext = appDbContext;
            _configuration = configuration;
            _generateJwt=generateJwt;
            _connectedUser = connectedUser;
            _loginHistoryRepository = loginHistoryRepository;
        }
        public async Task<(User user, string userToken)> Login(string email, string password)
        {

            var user = await _appDbContext.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.Password))
            {
                return (null,null);
            }
            var token = _generateJwt.GenerateJwtToken(user);

            var ip = _connectedUser.GetUserIP();
            var recent = await _loginHistoryRepository.GetRecentForUser(user.Id, ip ?? string.Empty, 1);
            if (recent == null)
            {
                await _loginHistoryRepository.Add(new LoginHistory
                {
                    UserId = user.Id,
                    IpAddress = ip,
                    LoginTime = DateTime.UtcNow
                });
            }

            var userToken = new IdToken
            {
                UserId = user.Id,
                Token = token,
                ExpiryDate = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };

            // Using JWT token in HTTP-only cookie
            

            await _appDbContext.IdTokens.AddAsync(userToken);
            await _appDbContext.SaveChangesAsync();

            return (user, token); 

        }
       
    }
}