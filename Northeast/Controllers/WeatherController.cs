using Microsoft.AspNetCore.Mvc;
using Northeast.Services;
using System.Text.Json;
using System.Collections.Generic;

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
                isDay = current.TryGetProperty("is_day", out var isDayProperty) &&
                        isDayProperty.GetInt32() == 1,
                windspeed = current.TryGetProperty("windspeed", out var speed)
                    ? speed.GetDecimal()
                    : (decimal)0
            };

            return Ok(result);
        }

        [HttpGet("forecast")]
        public async Task<IActionResult> GetForecast()
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

            var request = new HttpRequestMessage(HttpMethod.Get,
                $"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}");
            request.Headers.Add("User-Agent", "WT4Q/1.0 https://example.com");

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return BadRequest(new { message = "Forecast data unavailable" });
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("properties", out var properties) ||
                !properties.TryGetProperty("timeseries", out var series))
            {
                return BadRequest(new { message = "Forecast data unavailable" });
            }

            var list = new List<object>();
            int count = 0;
            foreach (var entry in series.EnumerateArray())
            {
                if (count >= 24) break;
                var time = entry.GetProperty("time").GetString();
                var details = entry.GetProperty("data").GetProperty("instant").GetProperty("details");
                var temp = details.GetProperty("air_temperature").GetDecimal();
                decimal wind = details.TryGetProperty("wind_speed", out var windProp) ? windProp.GetDecimal() : 0;
                string symbol = "";
                if (entry.GetProperty("data").TryGetProperty("next_1_hours", out var hour) &&
                    hour.TryGetProperty("summary", out var summary) &&
                    summary.TryGetProperty("symbol_code", out var codeProp))
                {
                    symbol = codeProp.GetString() ?? "";
                }
                list.Add(new { time, temperature = temp, windspeed = wind, symbol });
                count++;
            }

            return Ok(new { forecast = list });
        }
    }
}

