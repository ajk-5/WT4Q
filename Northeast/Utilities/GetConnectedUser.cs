using Northeast.Data;
using Northeast.Models;
using Northeast.Repository;
using System.Security.Claims;

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

            var ipAddress = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
                            httpContext.Connection.RemoteIpAddress?.ToString();
            return ipAddress;
        }
    }
}

