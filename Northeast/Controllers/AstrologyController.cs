using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Services.Astrology;
using Northeast.Utilities;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AstrologyController : ControllerBase
    {
        private readonly AstrologyService _astrologyService;
        private readonly AstrologyDispatcher _dispatcher;
        private readonly AstrologyOptions _options;
        private readonly GetConnectedUser _connectedUser;
        private readonly AppDbContext _dbContext;
        public AstrologyController(
            AstrologyService astrologyService,
            AstrologyDispatcher dispatcher,
            IOptions<AstrologyOptions> options,
            GetConnectedUser connectedUser,
            AppDbContext dbContext)
        {
            _astrologyService = astrologyService;
            _dispatcher = dispatcher;
            _options = options.Value;
            _connectedUser = connectedUser;
            _dbContext = dbContext;
        }

        [HttpGet("today")]
        public async Task<ActionResult<DailyHoroscopeDto>> GetToday(CancellationToken cancellationToken)
        {
            var date = DateOnly.FromDateTime(DateTime.UtcNow);
            var model = await _astrologyService.GetDailyHoroscopeAsync(date, cancellationToken);
            var dto = _astrologyService.ToDto(model);
            return Ok(dto);
        }

        private async Task<(Guid Id, string Email, string? Name)> RequireUserAsync(CancellationToken cancellationToken)
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty)
            {
                throw new UnauthorizedAccessException();
            }

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (user == null)
            {
                throw new UnauthorizedAccessException();
            }

            return (user.Id, user.Email, user.UserName);
        }

        private static AstrologySubscriptionDto ToDto(AstrologySubscription subscription)
        {
            var meta = ZodiacCatalogue.Find(subscription.SignId);
            return new AstrologySubscriptionDto
            {
                SignId = subscription.SignId,
                SignName = meta?.Name,
                CountryCode = subscription.CountryCode,
                TimeZone = subscription.TimeZone,
                SendHour = subscription.SendHour,
                LastSentLocalDate = subscription.LastSentForDate?.ToString("yyyy-MM-dd"),
                Active = subscription.Active,
                UserName = subscription.UserName
            };
        }

        [Authorize]
        [HttpGet("subscription")]
        public async Task<ActionResult<AstrologySubscriptionDto?>> GetSubscription(CancellationToken cancellationToken)
        {
            try
            {
                var (id, _, _) = await RequireUserAsync(cancellationToken);
                var subscription = await _astrologyService.GetSubscriptionAsync(id, cancellationToken);
                if (subscription == null)
                {
                    return Ok(null);
                }

                return Ok(ToDto(subscription));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Not logged in" });
            }
        }

        [Authorize]
        [HttpPost("subscription")]
        public async Task<ActionResult<AstrologySubscriptionDto>> UpsertSubscription(
            [FromBody] AstrologySubscriptionRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var (id, email, name) = await RequireUserAsync(cancellationToken);

                if (string.IsNullOrWhiteSpace(request.SignId))
                {
                    return BadRequest(new { message = "signId is required" });
                }

                var sign = ZodiacCatalogue.Find(request.SignId);
                if (sign == null)
                {
                    return BadRequest(new { message = "Unknown zodiac sign" });
                }

                try
                {
                    TimeZoneInfo.FindSystemTimeZoneById(request.TimeZone);
                }
                catch (TimeZoneNotFoundException)
                {
                    return BadRequest(new { message = "Invalid time zone" });
                }
                catch (InvalidTimeZoneException)
                {
                    return BadRequest(new { message = "Invalid time zone" });
                }

                var allowedHours = new HashSet<int> { 5, 6 };
                var sendHour = allowedHours.Contains(request.SendHour) ? request.SendHour : 5;

                var subscription = await _astrologyService.UpsertSubscriptionAsync(
                    id,
                    email,
                    name,
                    sign.Id,
                    request.CountryCode,
                    request.TimeZone,
                    sendHour,
                    cancellationToken);

                return Ok(ToDto(subscription));
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Not logged in" });
            }
        }

        [Authorize]
        [HttpDelete("subscription")]
        public async Task<IActionResult> DeleteSubscription(CancellationToken cancellationToken)
        {
            try
            {
                var (id, _, _) = await RequireUserAsync(cancellationToken);
                await _astrologyService.RemoveSubscriptionAsync(id, cancellationToken);
                return Ok(new { success = true });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Not logged in" });
            }
        }

        [HttpPost("dispatch")]
        public async Task<ActionResult<AstrologyDispatchReportDto>> Dispatch(CancellationToken cancellationToken)
        {
            if (!AuthorizeDispatch(Request))
            {
                return Unauthorized(new { message = "Unauthorized" });
            }

            var report = await _dispatcher.DispatchAsync(cancellationToken);
            return Ok(report);
        }

        private bool AuthorizeDispatch(HttpRequest request)
        {
            if (string.IsNullOrWhiteSpace(_options.DispatchToken))
            {
                return true;
            }

            var header = request.Headers["Authorization"].FirstOrDefault();
            if (header == null)
            {
                return false;
            }

            var token = header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? header.Substring("Bearer ".Length).Trim()
                : header.Trim();

            return string.Equals(token, _options.DispatchToken, StringComparison.Ordinal);
        }
    }
}
