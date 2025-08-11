using Microsoft.AspNetCore.Mvc;
using Northeast.Models;
using Northeast.Services;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArticleFilterController : ControllerBase
    {
        private readonly ArticleServices _articleServices;
        public ArticleFilterController(ArticleServices articleServices)
        {
            _articleServices = articleServices;
        }

        [HttpGet]
        public async Task<IActionResult> Filter(
            [FromQuery] Guid? id,
            [FromQuery] string? title,
            [FromQuery] string? content,
            [FromQuery] DateTime? date,
            [FromQuery] ArticleType? type,
            [FromQuery] Category? category,
            [FromQuery] Guid? authorId,
            [FromQuery] string? countryName,
            [FromQuery] string? countryCode,
            [FromQuery] string? keyword)
        {
            var results = await _articleServices.FilterArticles(id, title, content, date, type, category, authorId, countryName, countryCode, keyword);
            if (!results.Any())
            {
                return NotFound(new { message = "No articles found" });
            }
            return Ok(results);
        }
    }
}
