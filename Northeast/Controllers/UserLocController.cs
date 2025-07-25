using Microsoft.AspNetCore.Mvc;
using Northeast.Services;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class UserLocationController : ControllerBase
{

    private readonly SiteVisitorServices _siteVisitorServices;

    public UserLocationController(SiteVisitorServices siteVisitorServices)
    {
        _siteVisitorServices = siteVisitorServices;

    }

    [HttpGet("get-location")]
    public async Task<IActionResult> GetLocation()
    {


        try
        {
            var response = await _siteVisitorServices.VisitorLog();
            if (response == null)
            {
                return BadRequest(new { message = "error retrieving IP" });
            }


            return Ok(response);
        }

        catch (HttpRequestException ex)
        {
            return BadRequest($"Error retrieving location: {ex.Message}");
        }
    }
}
