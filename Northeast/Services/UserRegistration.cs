using Northeast.Data;
using Northeast.Models;
using BCrypt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Xml.Linq;
using Northeast.Services;
using Northeast.Repository;

namespace Northeast.Services
{
    public class UserRegistration
    {
        private readonly UserRepository _context;


        public UserRegistration(UserRepository context)
        {   
            _context = context;
      
        }
        public async Task<User> Register(string Username, string email, string password, string confirmPassword)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);

            var user = new User
            {
                UserName = Username,
                Password = passwordHash,
                Email = email,
                isVerified = false,
                Role = Role.User,

            };

            await _context.Add(user);

            return user;

        }

        public async Task<User> RegisterOrGetUserAsync(string Username, string email)
        {
            var user = await _context.GetUserByEmailAsync(email);

            if (user == null)
            {
                    user = new User
                    {
                        Id= Guid.NewGuid(),
                        Email = email,
                        UserName = Username,
                        isVerified = true,
                        Role = Role.User,
                    };

               await _context.Add(user);
             
            }

            return user;
        }
        public async Task ChangePassword(User user, string newPassword) {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.Password = passwordHash;

            await _context.Update(user);

        }
        public async Task<bool> userExists(string Email) {
            var user = await _context.GetUserByEmailAsync(Email);
            if(user == null)
            {
                return false;
            }
            return true;
        }
        }

    
}
