using Northeast.Data;
using Northeast.Models;
using Northeast.Repository;
using System.Security.Claims;
using System.Linq;
using System.Net;

namespace Northeast.Utilities
{
    public class GetConnectedUser
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetConnectedUser(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid Id => GetUserid();

        public string Id_String => Id.ToString();

        public Guid GetUserid()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                return Guid.Empty;
            }

            var user = httpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                return Guid.Empty;
            }

            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

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

        public string? GetUserIP()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                return null;
            }

            // Prefer headers added by proxies/CDNs, falling back to the connection IP.
            var ip = httpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault()
                     ?? httpContext.Request.Headers["True-Client-IP"].FirstOrDefault()
                     ?? httpContext.Request.Headers["X-Real-IP"].FirstOrDefault()
                     ?? httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim()
                     ?? httpContext.Connection.RemoteIpAddress?.ToString();

            if (IPAddress.TryParse(ip ?? string.Empty, out var addr))
            {
                return addr.MapToIPv4().ToString();
            }

            return null;
        }
    }
}

