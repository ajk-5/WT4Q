using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Services;

namespace Northeast.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuizController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AiQuizGeneratorService _aiQuizGenerator;

    public QuizController(AppDbContext db, AiQuizGeneratorService aiQuizGenerator)
    {
        _db = db;
        _aiQuizGenerator = aiQuizGenerator;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeDrafts = false, [FromQuery] bool published = false)
    {
        var q = _db.Quizzes.AsQueryable();
        if (published && !includeDrafts)
        {
            q = q.Where(x => x.Status == "published");
        }
        var list = await q
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Slug,
                x.Title,
                x.Description,
                x.Category,
                x.Type,
                createdAt = x.CreatedAtUtc,
                x.ImageUrl,
                x.Status,
                x.Tags,
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug([FromRoute] string slug)
    {
        var quiz = await _db.Quizzes
            .Include(q => q.Questions.OrderBy(qq => qq.Order))
            .Include(q => q.Show)
            .FirstOrDefaultAsync(q => q.Slug == slug);
        if (quiz == null) return NotFound(new { message = "Not found" });
        return Ok(new
        {
            slug = quiz.Slug,
            title = quiz.Title,
            description = quiz.Description,
            category = quiz.Category,
            type = quiz.Type,
            createdAt = quiz.CreatedAtUtc,
            imageUrl = quiz.ImageUrl,
            status = quiz.Status,
            tags = quiz.Tags,
            randomize = quiz.Randomize,
            timeLimitSec = quiz.TimeLimitSec,
            showExplanations = quiz.ShowExplanations,
            show = quiz.Show == null ? null : new { slug = quiz.Show.Slug, title = quiz.Show.Title, kind = quiz.Show.Kind, imageUrl = quiz.Show.ImageUrl },
            questions = quiz.Questions.Select(q => new
            {
                id = q.Id,
                prompt = q.Prompt,
                imageUrl = q.ImageUrl,
                choices = q.Choices,
                answer = q.Answer,
                explanation = q.Explanation,
                points = q.Points,
                difficulty = q.Difficulty,
                order = q.Order,
            }),
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("ai-generate")]
    public async Task<IActionResult> AiGenerate([FromBody] QuizAiGenerateRequestDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var generated = await _aiQuizGenerator.GenerateAsync(dto, ct);
        if (generated == null)
            return StatusCode(502, new { message = "AI quiz generation failed. Try again in a minute." });

        // Ensure show linkage hints from request survive even when AI omits them.
        generated.ShowSlug ??= dto.ShowSlug;
        generated.ShowId ??= dto.ShowId;

        if (!dto.Publish)
        {
            return Ok(new QuizAiGenerateResponseDto
            {
                Quiz = generated,
                Published = false
            });
        }

        var quiz = await BuildQuizAsync(generated, ct);
        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync(ct);

        generated.Slug = quiz.Slug;
        return Ok(new QuizAiGenerateResponseDto
        {
            Quiz = generated,
            Published = true,
            Slug = quiz.Slug
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] QuizUpsertDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var quiz = await BuildQuizAsync(dto, ct);

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetBySlug), new { slug = quiz.Slug }, new { slug = quiz.Slug });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{slug}")]
    public async Task<IActionResult> Update([FromRoute] string slug, [FromBody] QuizUpsertDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var quiz = await _db.Quizzes.Include(q => q.Questions).FirstOrDefaultAsync(q => q.Slug == slug);
        if (quiz == null) return NotFound(new { message = "Not found" });

        // Resolve Show link (optional)
        Guid? showId = null;
        if (dto.ShowId.HasValue)
        {
            var show = await _db.Shows.FirstOrDefaultAsync(s => s.Id == dto.ShowId);
            showId = show?.Id;
        }
        else if (!string.IsNullOrWhiteSpace(dto.ShowSlug))
        {
            var show = await _db.Shows.FirstOrDefaultAsync(s => s.Slug == dto.ShowSlug);
            showId = show?.Id;
        }

        using var tx = await _db.Database.BeginTransactionAsync();

        var rows = await _db.Quizzes
            .Where(q => q.Id == quiz.Id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Title, x => dto.Title)
                .SetProperty(x => x.Description, x => dto.Description)
                .SetProperty(x => x.Category, x => dto.Category)
                .SetProperty(x => x.Type, x => dto.Type)
                .SetProperty(x => x.Author, x => dto.Author)
                .SetProperty(x => x.ImageUrl, x => dto.ImageUrl)
                .SetProperty(x => x.Tags, x => dto.Tags)
                .SetProperty(x => x.Randomize, x => dto.Randomize ?? x.Randomize)
                .SetProperty(x => x.TimeLimitSec, x => dto.TimeLimitSec ?? x.TimeLimitSec)
                .SetProperty(x => x.ShowExplanations, x => dto.ShowExplanations ?? x.ShowExplanations)
                .SetProperty(x => x.Status, x => dto.Status ?? x.Status)
                .SetProperty(x => x.PublishedAtUtc, x => dto.PublishedAtUtc ?? x.PublishedAtUtc)
                .SetProperty(x => x.UpdatedAtUtc, x => DateTime.UtcNow)
                .SetProperty(x => x.ShowId, x => showId)
            );
        if (rows == 0)
        {
            await tx.RollbackAsync();
            return NotFound(new { message = "Not found" });
        }

        await _db.QuizQuestions
            .Where(qq => qq.QuizId == quiz.Id)
            .ExecuteDeleteAsync();

        var newQuestions = dto.Questions
            .Select((x, i) => new QuizQuestion
            {
                QuizId = quiz.Id,
                Prompt = x.Prompt,
                ImageUrl = x.ImageUrl,
                Choices = x.Choices,
                Answer = x.Answer,
                Explanation = x.Explanation,
                Points = x.Points,
                Difficulty = x.Difficulty,
                Order = x.Order > 0 ? x.Order : i,
            })
            .ToList();
        if (newQuestions.Count > 0)
        {
            await _db.QuizQuestions.AddRangeAsync(newQuestions);
            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();
        return Ok(new { slug = quiz.Slug });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete([FromRoute] string slug)
    {
        var quiz = await _db.Quizzes.FirstOrDefaultAsync(q => q.Slug == slug);
        if (quiz == null) return NotFound(new { message = "Not found" });
        _db.Quizzes.Remove(quiz);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    private static string Slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return Guid.NewGuid().ToString("n");
        var s = input.ToLowerInvariant();
        s = System.Text.RegularExpressions.Regex.Replace(s, "[^a-z0-9]+", "-");
        s = s.Trim('-');
        return string.IsNullOrWhiteSpace(s) ? Guid.NewGuid().ToString("n") : s;
    }

    private async Task<string> EnsureUniqueQuizSlugAsync(string baseSlug)
    {
        if (string.IsNullOrWhiteSpace(baseSlug)) return Guid.NewGuid().ToString("n");
        var candidate = baseSlug;
        var suffix = 2;
        while (await _db.Quizzes.AsNoTracking().AnyAsync(q => q.Slug == candidate))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return candidate;
    }

    private async Task<Quiz> BuildQuizAsync(QuizUpsertDto dto, CancellationToken ct)
    {
        var baseSlug = Slugify(dto.Slug ?? dto.Title);
        var slug = await EnsureUniqueQuizSlugAsync(baseSlug);

        var quiz = new Quiz
        {
            Slug = slug,
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            Type = dto.Type,
            Author = dto.Author,
            ImageUrl = dto.ImageUrl,
            Tags = dto.Tags,
            Randomize = dto.Randomize ?? false,
            TimeLimitSec = dto.TimeLimitSec,
            ShowExplanations = dto.ShowExplanations ?? true,
            Status = dto.Status ?? "published",
            PublishedAtUtc = dto.PublishedAtUtc ?? ((dto.Status ?? "published") == "published" ? DateTime.UtcNow : null),
            CreatedAtUtc = DateTime.UtcNow,
        };

        if (dto.ShowId.HasValue)
        {
            var show = await _db.Shows.FirstOrDefaultAsync(s => s.Id == dto.ShowId, ct);
            if (show != null) quiz.ShowId = show.Id;
        }
        else if (!string.IsNullOrWhiteSpace(dto.ShowSlug))
        {
            var show = await _db.Shows.FirstOrDefaultAsync(s => s.Slug == dto.ShowSlug, ct);
            if (show != null) quiz.ShowId = show.Id;
        }

        quiz.Questions = dto.Questions
            .Select((x, i) => new QuizQuestion
            {
                Prompt = x.Prompt,
                ImageUrl = x.ImageUrl,
                Choices = x.Choices,
                Answer = x.Answer,
                Explanation = x.Explanation,
                Points = x.Points,
                Difficulty = x.Difficulty,
                Order = x.Order > 0 ? x.Order : i,
            }).ToList();

        return quiz;
    }
}
