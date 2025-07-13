using Northeast.Data;
using Northeast.Models;
using Northeast.Repository;
using System.Security.Claims;

namespace Northeast.Utilities
{
    public class GetConnectedUser
    {
        public Guid Id { get; set; }
        public string Id_String { get; set; }

        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetConnectedUser(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
            Id = GetUserid();
            Id_String = GetUseridtoString();
        }
        public Guid GetUserid()
        {
            var user = _httpContextAccessor.HttpContext.User;
            if (!user.Identity.IsAuthenticated)
            {
                Console.WriteLine("User is not authenticated.");
                return Guid.Empty;
            }
            var userId = _httpContextAccessor.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);


            if (string.IsNullOrEmpty(userId))
            {
                return Guid.Empty;

            }
            if (!Guid.TryParse(userId, out var userGuid))
            {

                return Guid.Empty;
            }


            return userGuid;
        }
        public string GetUseridtoString()
        {

            return GetUserid().ToString();
        }
        public string GetUserIP()
        {
            var ipAddress = _httpContextAccessor.HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
             _httpContextAccessor.HttpContext.Connection.RemoteIpAddress?.ToString();
            return ipAddress;
        }

    }
}

