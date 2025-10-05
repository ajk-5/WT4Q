using Microsoft.AspNetCore.Mvc;
using Northeast.Models;
using Northeast.Services;
using Northeast.DTOs;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArticleSearchController : ControllerBase
    {
        private readonly ArticleServices _articleServices;

        public ArticleSearchController(ArticleServices articleServices)
        {
            _articleServices = articleServices;
        }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { message = "Query cannot be empty" });
            }

            var results = await _articleServices.Search(query);

            if (results == null || !results.Any())
            {
                return NotFound(new { message = "No articles found" });
            }

            return Ok(results);
        }

        [HttpGet("advanced")]
        public async Task<IActionResult> SearchAdvanced(
            [FromQuery] string? title,
            [FromQuery] string? keyword,
            [FromQuery] DateTime? date,
            [FromQuery] ArticleType? type,
            [FromQuery] Category? category)
        {
            var results = await _articleServices.Search(title, keyword, date, type, category);

            if (!results.Any())
            {
                return NotFound(new { message = "No articles found" });
            }

            return Ok(results);
        }

        [HttpGet("by-type")]
        public async Task<IActionResult> SearchByType([FromQuery] ArticleType type)
        {
            var results = await _articleServices.SearchByArticleType(type);
            if (!results.Any())
            {
                return NotFound(new { message = "No articles found" });
            }
            return Ok(results);
        }

        [HttpGet("by-author/{authorId}")]
        public async Task<IActionResult> SearchByAuthor(Guid authorId)
        {
            var results = await _articleServices.SearchByAuthor(authorId);
            if (!results.Any())
            {
                return NotFound(new { message = "No articles found" });
            }
            return Ok(results);
        }

        [HttpGet("paged")]
        public async Task<IActionResult> SearchPaged([FromQuery] SearchQueryDto query)
        {
            if (query.PageSize <= 0 || query.PageSize > 100) query.PageSize = 20;
            if (query.Page <= 0) query.Page = 1;
            var result = await _articleServices.SearchPagedAsync(query);
            return Ok(result);
        }
    }
}
