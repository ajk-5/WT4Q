using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northeast.DTOs;
using Northeast.Services;

namespace Northeast.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CocktailController : ControllerBase
    {
        private readonly CocktailService _service;
        public CocktailController(CocktailService service)
        {
            _service = service;
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CocktailDto dto)
        {
            if (dto == null) return BadRequest();
            await _service.Publish(dto);
            return Ok(dto);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _service.GetAll();
            return Ok(items);
        }

        [HttpGet("id/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _service.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var item = await _service.GetBySlug(slug);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            var items = await _service.Search(query);
            return Ok(items);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CocktailDto dto)
        {
            await _service.Update(id, dto);
            return Ok();
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.Delete(id);
            return Ok();
        }
    }
}
