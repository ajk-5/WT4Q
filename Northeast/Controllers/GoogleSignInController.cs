using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Northeast.Data;
using Northeast.Models;
using Northeast.Services;
using Northeast.Utilities;

namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GoogleSignInController : ControllerBase
    {
        private readonly UserRegistration _userService;
        private readonly GenerateJwt _generateJwt;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GoogleSignInController> _logger;
        private readonly AppDbContext _db;

        public GoogleSignInController(
            UserRegistration userService,
            GenerateJwt generateJwt,
            IConfiguration configuration,
            AppDbContext db,
            ILogger<GoogleSignInController> logger)
        {
            _userService = userService;
            _generateJwt = generateJwt;
            _configuration = configuration;
            _db = db;
            _logger = logger;
        }

        private static string GenerateSecureToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToBase64String(bytes);
        }

        private static string HashToken(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        // Single endpoint for BOTH initiating Google login and handling the callback
        [HttpGet("google-auth")]
        public async Task<IActionResult> GoogleAuth([FromQuery] string? returnUrl)
        {
            // Attempt to see if the user is returning from Google with valid credentials
            var authResult = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);

            // 1) If not authenticated yet, begin the Google challenge
            if (!authResult.Succeeded || authResult?.Principal == null)
            {
                // Build the absolute URL that points back to this same endpoint
                var redirectUrl = Url.Action(
                    action: nameof(GoogleAuth), // "google-auth"
                    controller: "GoogleSignIn",
                    values: new { returnUrl },
                    protocol: Request.Scheme,
                    host: Request.Host.Value
                );

                _logger.LogInformation("No Google identity yet. Redirecting user to Google login: {RedirectUrl}", redirectUrl);

                var properties = new AuthenticationProperties
                {
                    RedirectUri = redirectUrl
                };

                // This triggers the Google OAuth page
                return Challenge(properties, GoogleDefaults.AuthenticationScheme);
            }

            // 2) If we get here, the user has just been redirected back from Google
            _logger.LogInformation("User returned from Google. Principal: {Name}", authResult.Principal.Identity?.Name);

            // Extract user identity
            var identity = authResult.Principal.Identity as ClaimsIdentity;
            if (identity == null)
            {
                _logger.LogWarning("No valid identity in Google response.");
                return BadRequest("Invalid authentication result.");
            }

            var emailClaim = identity.FindFirst(ClaimTypes.Email);
            var nameClaim = identity.FindFirst(ClaimTypes.Name);

            if (emailClaim == null || string.IsNullOrEmpty(emailClaim.Value))
            {
                _logger.LogWarning("Email claim missing in Google response.");
                return BadRequest("Email not found in Google claims.");
            }

            // Register or get existing user
            string email = emailClaim.Value;
            string name = nameClaim?.Value ?? "Unknown";
            var user = await _userService.RegisterOrGetUserAsync(name, email);

            var accessToken = _generateJwt.GenerateJwtToken(user);
            var accessExp = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]));

            await _db.IdTokens.AddAsync(new IdToken
            {
                UserId = user.Id,
                Token = accessToken,
                ExpiryDate = accessExp
            });

            var refreshRaw = GenerateSecureToken();
            var refreshExp = DateTime.UtcNow.AddDays(14);

            await _db.RefreshTokens.AddAsync(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = HashToken(refreshRaw),
                ExpiresAtUtc = refreshExp,
                CreatedAtUtc = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            });

            await _db.SaveChangesAsync();

            var secure = Request.IsHttps;

            var accessCookie = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = accessExp
            };
            var refreshCookie = new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = SameSiteMode.None,
                Path = "/",
                Expires = refreshExp
            };

            Response.Cookies.Append("JwtToken", accessToken, accessCookie);
            Response.Cookies.Append("RefreshToken", refreshRaw, refreshCookie);

            _logger.LogInformation("Google login successful for {Email}", email);

            // Redirect back to the requesting client
            var targetUrl = "/";
            if (!string.IsNullOrEmpty(returnUrl) &&
                Uri.IsWellFormedUriString(returnUrl, UriKind.Absolute))
            {
                targetUrl = returnUrl;
            }

            return Redirect(targetUrl);
        }
    }
}
