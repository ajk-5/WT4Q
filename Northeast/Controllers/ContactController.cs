using Microsoft.AspNetCore.Mvc;
using Northeast.Repository;
using Northeast.Services;
using Northeast.Utilities;
using System;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContactController : ControllerBase
    {
        private readonly GetConnectedUser _connectedUser;
        private readonly UserRepository _userRepository;
        private readonly SendEmail _sendEmail;

        public ContactController(GetConnectedUser connectedUser, UserRepository userRepository, SendEmail sendEmail)
        {
            _connectedUser = connectedUser;
            _userRepository = userRepository;
            _sendEmail = sendEmail;
        }

        public class ContactRequest
        {
            public string? Email { get; set; }
            public string Message { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] ContactRequest request)
        {
            var userId = _connectedUser.Id;
            string? email = request.Email;

            if (userId != Guid.Empty)
            {
                var user = await _userRepository.GetByGUId(userId);
                if (user != null)
                {
                    email = user.Email;
                }
            }

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { message = "Invalid request" });
            }

            await _sendEmail.SendPersonalizedEmail(email, "Thank you for contacting The 90s times", "Thank you for your message. We will get back to you soon.");

            return Ok(new { message = "Message sent" });
        }
    }
}
