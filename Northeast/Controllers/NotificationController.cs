using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northeast.Repository;
using Northeast.Utilities;
using System.Linq;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly NotificationRepository _notificationRepository;
        private readonly GetConnectedUser _connectedUser;

        public NotificationController(NotificationRepository notificationRepository, GetConnectedUser connectedUser)
        {
            _notificationRepository = notificationRepository;
            _connectedUser = connectedUser;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var userId = _connectedUser.Id;
            var all = await _notificationRepository.GetAll();
            var userNotifications = all.Where(n => n.RecipientId == userId)
                                       .OrderByDescending(n => n.CreatedAt);
            return Ok(userNotifications);
        }

        [HttpPost("mark-as-read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var notification = await _notificationRepository.GetByGUId(id);
            if (notification == null) return NotFound();
            if (notification.RecipientId != _connectedUser.Id) return Forbid();
            notification.IsRead = true;
            await _notificationRepository.Update(notification);
            return Ok();
        }
    }
}

