using Microsoft.AspNetCore.Mvc;
using Northeast.Services;
using System.Text.Json;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WeatherController : ControllerBase
    {
        private readonly SiteVisitorServices _siteVisitorServices;
        private readonly HttpClient _httpClient;

        public WeatherController(SiteVisitorServices siteVisitorServices, HttpClient httpClient)
        {
            _siteVisitorServices = siteVisitorServices;
            _httpClient = httpClient;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrent()
        {
            var visitor = await _siteVisitorServices.VisitorLog();
            if (visitor == null || string.IsNullOrEmpty(visitor.Location))
            {
                return BadRequest(new { message = "Unable to determine location." });
            }

            var parts = visitor.Location.Split(',');
            if (parts.Length != 2 ||
                !double.TryParse(parts[0], out var lat) ||
                !double.TryParse(parts[1], out var lon))
            {
                return BadRequest(new { message = "Invalid location." });
            }

            var url = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true";
            var json = await _httpClient.GetStringAsync(url);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("current_weather", out var current))
            {
                return BadRequest(new { message = "Weather data unavailable" });
            }

            var result = new
            {
                temperature = current.GetProperty("temperature").GetDecimal(),
                weathercode = current.GetProperty("weathercode").GetInt32(),
                windspeed = current.TryGetProperty("windspeed", out var speed)
                    ? speed.GetDecimal()
                    : (decimal)0
            };

            return Ok(result);
        }
    }
}

