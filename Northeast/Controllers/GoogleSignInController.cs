using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
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

        public GoogleSignInController(
            UserRegistration userService,
            GenerateJwt generateJwt,
            IConfiguration configuration,
            ILogger<GoogleSignInController> logger)
        {
            _userService = userService;
            _generateJwt = generateJwt;
            _configuration = configuration;
            _logger = logger;
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

            // Generate JWT token for the user
            var token = _generateJwt.GenerateJwtToken(user);

            _logger.LogInformation("Google login successful for {Email}", email);

            // Optional: Set JWT in a cookie 
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddMinutes(
                    Convert.ToInt32(_configuration["Jwt:ExpireMinutes"]))
            };
            Response.Cookies.Append("JwtToken", token, cookieOptions);

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
