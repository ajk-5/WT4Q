using Microsoft.AspNetCore.Mvc;
using Northeast.Services;
using Northeast.DTOs;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VisitLogController : ControllerBase
    {
        private readonly SiteVisitorServices _siteVisitorServices;

        public VisitLogController(SiteVisitorServices siteVisitorServices)
        {
            _siteVisitorServices = siteVisitorServices;
        }

        [HttpPost("page-visit")]
        public async Task<IActionResult> LogPage([FromBody] PageVisitDTO dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.PageUrl)) return BadRequest();
            await _siteVisitorServices.LogPageVisit(dto.PageUrl);
            return Ok();
        }
    }
}
