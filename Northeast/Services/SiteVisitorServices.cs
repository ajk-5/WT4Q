using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Northeast.Models;
using Northeast.Repository;
using Northeast.Utilities;
using System.Net;
using System.Text.Json;

namespace Northeast.Services
{
    public class SiteVisitorServices
    {
        private readonly HttpClient _httpClient;
        private readonly GetConnectedUser _getConnectedUser;
        private readonly UserRepository _userRepository;
        private readonly VisitorsRepository _visitorsRepository;
        private readonly PageVisitRepository _pageVisitRepository;
        private readonly IMemoryCache _cache;
        private readonly ILogger<SiteVisitorServices> _logger;

        public SiteVisitorServices(HttpClient httpClient,
            UserRepository userRepository,
            GetConnectedUser getConnectedUser,
            VisitorsRepository visitorsRepository,
            PageVisitRepository pageVisitRepository,
            IMemoryCache cache,
            ILogger<SiteVisitorServices> logger)
        {
            _httpClient = httpClient;
            _userRepository = userRepository;
            _getConnectedUser = getConnectedUser;
            _visitorsRepository = visitorsRepository;
            _pageVisitRepository = pageVisitRepository;
            _cache = cache;
            _logger = logger;
        }


        public async Task<Visitors> VisitorLog()
        {
            var ipAddress = _getConnectedUser.GetUserIP();

            if (!IPAddress.TryParse(ipAddress ?? string.Empty, out _))
            {
                return null;
            }

            var cacheKey = $"ipinfo:{ipAddress}";
            if (!_cache.TryGetValue(cacheKey, out IpinfoResponse? locationData))
            {
                locationData = await FetchIpInfo(ipAddress);
                if (locationData != null)
                {
                    _cache.Set(cacheKey, locationData, TimeSpan.FromHours(24));
                }
            }

            if (locationData == null)
            {
                return null;
            }

            Visitors? visitors = null;

            var userId = _getConnectedUser.GetUserid();

            if (userId != Guid.Empty)
            {
                visitors = await _visitorsRepository.GetByUserIdAsync(userId);
                if (visitors == null)
                {
                    visitors = new Visitors();
                }

                var user = await _userRepository.GetByGUId(userId);
                if (user != null)
                {
                    visitors.User = user;
                    visitors.UserId = user.Id;
                }

                visitors.IsGuest = false;
            }
            else
            {
                visitors = await _visitorsRepository.GetGuestByIpAsync(ipAddress) ?? new Visitors();
                visitors.IsGuest = true;
            }
            var now = DateTime.UtcNow;
            bool duplicate = visitors.Id != 0 && visitors.VisitTime.HasValue &&
                Math.Abs((now - visitors.VisitTime.Value).TotalMinutes) < 1 &&
                visitors.IpAddress == locationData.Ip &&
                visitors.Location == locationData.Loc &&
                visitors.City == locationData.City &&
                visitors.Country == locationData.Country &&
                visitors.Region == locationData.Region &&
                visitors.Org == locationData.Org &&
                visitors.PostalCode == locationData.Postal &&
                visitors.Timezone == locationData.Timezone;

            if (duplicate)
            {
                return visitors;
            }

            if (locationData.Ip != null)
            {
                visitors.IpAddress = locationData.Ip;
            }
            if (locationData.Org != null)
            {
                visitors.Org = locationData.Org;
            }
            if (locationData.Loc != null)
            {
                visitors.Location = locationData.Loc;
            }
            if (locationData.City != null)
            {
                visitors.City = locationData.City;
            }
            if (locationData.Country != null)
            {
                visitors.Country = locationData.Country;
            }
            if (locationData.Postal != null)
            {
                visitors.PostalCode = locationData.Postal;
            }
            if (locationData.Timezone != null)
            {
                visitors.Timezone = locationData.Timezone;
            }
            if (locationData.Region != null)
            {
                visitors.Region = locationData.Region;
            }
            visitors.VisitTime = now;

            if (visitors.Id == 0)
            {
                await _visitorsRepository.Add(visitors);
            }
            else
            {
                await _visitorsRepository.Update(visitors);
            }

            return visitors;
        }

        private async Task<IpinfoResponse?> FetchIpInfo(string ipAddress)
        {
            var token = Environment.GetEnvironmentVariable("IPINFO_TOKEN");
            var apiUrl = $"https://ipinfo.io/{ipAddress}/json";
            if (!string.IsNullOrEmpty(token))
            {
                apiUrl += $"?token={token}";
            }

            for (var attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    var response = await _httpClient.GetAsync(apiUrl);
                    if (response.StatusCode == HttpStatusCode.TooManyRequests)
                    {
                        _logger.LogWarning("ipinfo.io rate limit exceeded for {IP}", ipAddress);
                        await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt + 1)));
                        continue;
                    }

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Failed to fetch IP info for {IP}: {StatusCode}", ipAddress, response.StatusCode);
                        return null;
                    }

                    var content = await response.Content.ReadAsStringAsync();
                    return JsonSerializer.Deserialize<IpinfoResponse>(content);
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogError(ex, "Error fetching IP info for {IP}", ipAddress);
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt + 1)));
                }
            }

            return null;
        }

        public async Task LogPageVisit(string pageUrl)
        {
            var visitor = await VisitorLog();
            if (visitor == null)
            {
                return;
            }

            var recent = await _pageVisitRepository.GetRecentVisit(visitor.Id, pageUrl, 1);
            if (recent != null)
            {
                return;
            }

            await _pageVisitRepository.Add(new PageVisit
            {
                VisitorId = visitor.Id,
                PageUrl = pageUrl,
                VisitTime = DateTime.UtcNow
            });
        }
    }
}
