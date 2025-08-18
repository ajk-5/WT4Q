using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Northeast.Services;
using System;
using System.Text.Json;
using System.Collections.Generic;
using System.Net.Http.Headers;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WeatherController : ControllerBase
    {
        private readonly SiteVisitorServices _siteVisitorServices;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;

        public WeatherController(SiteVisitorServices siteVisitorServices, HttpClient httpClient, IMemoryCache cache)
        {
            _siteVisitorServices = siteVisitorServices;
            _httpClient = httpClient;
            _cache = cache;
        }

        [HttpGet("current")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
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

            var cacheKey = $"current-{lat}-{lon}";
            if (_cache.TryGetValue(cacheKey, out object cachedCurrent))
            {
                return Ok(cachedCurrent);
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

            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(10));

            return Ok(result);
        }

        [HttpGet("details")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetDetails()
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

            var cacheKey = $"details-{lat}-{lon}";
            if (_cache.TryGetValue(cacheKey, out object cached))
            {
                return Ok(cached);
            }

            try
            {
                var url = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true";
                var json = await _httpClient.GetStringAsync(url);
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("current_weather", out var current))
                {
                    return BadRequest(new { message = "Weather data unavailable" });
                }

                decimal? airQuality = null;
                try
                {
                    var aqiUrl = $"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=us_aqi";
                    var aqiJson = await _httpClient.GetStringAsync(aqiUrl);
                    using var aqiDoc = JsonDocument.Parse(aqiJson);
                    if (aqiDoc.RootElement.TryGetProperty("current", out var aqiCurrent) &&
                        aqiCurrent.TryGetProperty("us_aqi", out var aqiProp))
                    {
                        airQuality = aqiProp.GetDecimal();
                    }
                }
                catch
                {
                    airQuality = null;
                }

                decimal? uvIndex = null;
                try
                {
                    var uvUrl = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=uv_index";
                    var uvJson = await _httpClient.GetStringAsync(uvUrl);
                    using var uvDoc = JsonDocument.Parse(uvJson);
                    if (uvDoc.RootElement.TryGetProperty("current", out var uvCurrent) &&
                        uvCurrent.TryGetProperty("uv_index", out var uvProp))
                    {
                        uvIndex = uvProp.GetDecimal();
                    }
                }
                catch
                {
                    uvIndex = null;
                }

                var alerts = new List<string>();
                try
                {
                    var alertRequest = new HttpRequestMessage(HttpMethod.Get,
                        $"https://api.met.no/weatherapi/metalerts/2.0/complete?lat={lat}&lon={lon}");
                    alertRequest.Headers.Add("User-Agent", "WT4Q/1.0 https://example.com");
                    alertRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                    var alertResponse = await _httpClient.SendAsync(alertRequest);
                    if (alertResponse.IsSuccessStatusCode)
                    {
                        var alertJson = await alertResponse.Content.ReadAsStringAsync();
                        using var alertDoc = JsonDocument.Parse(alertJson);
                        if (alertDoc.RootElement.TryGetProperty("features", out var features))
                        {
                            foreach (var feature in features.EnumerateArray())
                            {
                                if (feature.TryGetProperty("properties", out var props))
                                {
                                    if (props.TryGetProperty("event", out var evt))
                                    {
                                        var name = evt.GetString();
                                        if (!string.IsNullOrWhiteSpace(name))
                                            alerts.Add(name);
                                    }
                                    else if (props.TryGetProperty("headline", out var head))
                                    {
                                        var title = head.GetString();
                                        if (!string.IsNullOrWhiteSpace(title))
                                            alerts.Add(title);
                                    }
                                }
                            }
                        }
                    }
                }
                catch
                {
                    alerts = new List<string>();
                }

                var result = new
                {
                    temperature = current.GetProperty("temperature").GetDecimal(),
                    weathercode = current.GetProperty("weathercode").GetInt32(),
                    isDay = current.TryGetProperty("is_day", out var isDayProperty) &&
                            isDayProperty.GetInt32() == 1,
                    windspeed = current.TryGetProperty("windspeed", out var speed)
                        ? speed.GetDecimal()
                        : (decimal)0,
                    airQuality,
                    uvIndex,
                    alerts
                };

                _cache.Set(cacheKey, result, TimeSpan.FromMinutes(10));

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Request failed", detail = ex.Message });
            }
        }

        [HttpGet("forecast")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
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

            var cacheKey = $"forecast-{lat}-{lon}";
            if (_cache.TryGetValue(cacheKey, out object cachedForecast))
            {
                return Ok(cachedForecast);
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
            var result = new { forecast = list };

            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(10));

            return Ok(result);
        }
    }
}

