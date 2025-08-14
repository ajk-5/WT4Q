using Microsoft.AspNetCore.Mvc;
using Northeast.Models;
using Northeast.Repository;
using Northeast.Utilities;
using System.Net;
using System.Security.Claims;
using System.Text.Json;

namespace Northeast.Services
{
    public class SiteVisitorServices
    {
        private readonly HttpClient _httpClient;
        private readonly  GetConnectedUser _getConnectedUser;
        private readonly UserRepository _userRepository;
        private readonly VisitorsRepository _visitorsRepository;
        private readonly PageVisitRepository _pageVisitRepository;
        public SiteVisitorServices(HttpClient httpClient, UserRepository userRepository, GetConnectedUser getConnectedUser, VisitorsRepository visitorsRepository, PageVisitRepository pageVisitRepository)
        {
            _httpClient = httpClient;
            _userRepository = userRepository;
            _getConnectedUser = getConnectedUser;
            _visitorsRepository = visitorsRepository;
            _pageVisitRepository = pageVisitRepository;
        }


        public async Task<Visitors> VisitorLog()
        {
            var ipAddress = _getConnectedUser.GetUserIP();
            
            // Fallback if running on a loopback address (will return the server's location)
            if (string.IsNullOrWhiteSpace(ipAddress) || ipAddress == "::1" || ipAddress == "127.0.0.1")
            {

                ipAddress = await _httpClient.GetStringAsync("https://api64.ipify.org");

            }
            if (!IPAddress.TryParse(ipAddress, out _))
            {
                return null;
            }
    

            var apiUrl = $"https://ipinfo.io/{ipAddress}/json";


            var response = await _httpClient.GetStringAsync(apiUrl);
            var locationData = JsonSerializer.Deserialize<IpinfoResponse>(response);

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
            if (locationData != null)
            {
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

                if (locationData.Ip!=null) {
                    visitors.IpAddress = locationData.Ip;
                };
                if(locationData.Org!=null)
                {
                    visitors.Org = locationData.Org;
                }
                if(locationData.Loc!=null)
                {
                    visitors.Location = locationData.Loc;
                }
                if(locationData.City!=null)
                {
                    visitors.City = locationData.City;
                }
                if(locationData.Country!=null)
                {
                    visitors.Country = locationData.Country;
                }
                if(locationData.Postal!=null)
                {
                    visitors.PostalCode= locationData.Postal;
                }
                if(locationData.Timezone!=null) {
                    visitors.Timezone = locationData.Timezone;
                }
                if (locationData.Region!=null) {
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
