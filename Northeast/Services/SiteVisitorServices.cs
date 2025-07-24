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
        public SiteVisitorServices(HttpClient httpClient, UserRepository userRepository, GetConnectedUser getConnectedUser, VisitorsRepository visitorsRepository)
        {
            _httpClient = httpClient;
            _userRepository = userRepository;
            _getConnectedUser = getConnectedUser;
            _visitorsRepository = visitorsRepository;
        }


        public async Task<Visitors> VisitorLog()
        {
            var ipAddress = _getConnectedUser.GetUserIP();

            // Fallback in case of localhost (will return the server's location)
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
                visitors.VisitTime = DateTime.UtcNow;

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
    }
}
