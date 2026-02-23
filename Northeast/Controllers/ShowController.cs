using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using Microsoft.AspNetCore.StaticFiles;

namespace Northeast.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShowController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private static readonly FileExtensionContentTypeProvider ContentTypeProvider = new();

    public ShowController(AppDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    private string? Absolutize(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return url;
        var s = url.Trim();
        if (s.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || s.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || s.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return s;

        if (!s.StartsWith('/')) s = "/" + s.TrimStart('/');

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault()
                     ?? HttpContext.Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault()
                    ?? (HttpContext.Request.Host.HasValue ? HttpContext.Request.Host.Value : string.Empty);
        if (string.IsNullOrWhiteSpace(host)) return s; // fallback to relative
        return $"{scheme}://{host}{s}";
    }

    private string BuildShowImageUrl(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return string.Empty;

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault()
                     ?? HttpContext.Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault()
                    ?? (HttpContext.Request.Host.HasValue ? HttpContext.Request.Host.Value : string.Empty);
        var path = $"/api/Show/{Uri.EscapeDataString(slug)}/image";
        if (string.IsNullOrWhiteSpace(host)) return path;
        return $"{scheme}://{host}{path}";
    }

    private static string ResolveUploadsRoot()
    {
        var uploadsRoot = Environment.GetEnvironmentVariable("UPLOADS_ROOT");
        if (string.IsNullOrWhiteSpace(uploadsRoot))
        {
            uploadsRoot = "/uploads";
        }
        if (!Path.IsPathRooted(uploadsRoot))
        {
            uploadsRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, uploadsRoot));
        }
        Directory.CreateDirectory(uploadsRoot);
        return uploadsRoot;
    }

    private static string? ExtractUploadsRelativePath(string? pathOrUrl)
    {
        if (string.IsNullOrWhiteSpace(pathOrUrl)) return null;
        var trimmed = pathOrUrl.Trim();
        string working = trimmed;

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            // If this is a Media/raw URL, prefer the "path" query parameter which
            // points at the underlying /uploads/... location.
            if (absolute.AbsolutePath.StartsWith("/api/Media/raw", StringComparison.OrdinalIgnoreCase))
            {
                var query = absolute.Query;
                if (!string.IsNullOrEmpty(query))
                {
                    // query starts with '?'
                    var parts = query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
                    foreach (var part in parts)
                    {
                        var kv = part.Split('=', 2);
                        if (kv.Length == 2 && string.Equals(kv[0], "path", StringComparison.OrdinalIgnoreCase))
                        {
                            working = Uri.UnescapeDataString(kv[1]);
                            break;
                        }
                    }
                }
            }
            else
            {
                working = absolute.AbsolutePath;
            }
        }

        var uploadsIndex = working.IndexOf("/uploads/", StringComparison.OrdinalIgnoreCase);
        if (uploadsIndex >= 0)
        {
            working = working.Substring(uploadsIndex + "/uploads/".Length);
        }
        else
        {
            working = working.TrimStart('/', '\\');
        }

        var qIndex = working.IndexOf('?', StringComparison.Ordinal);
        if (qIndex >= 0)
        {
            working = working.Substring(0, qIndex);
        }

        if (string.IsNullOrWhiteSpace(working) || working.Contains("..", StringComparison.Ordinal))
        {
            return null;
        }

        return working.Replace('\\', Path.DirectorySeparatorChar).Replace('/', Path.DirectorySeparatorChar);
    }

    private async Task<(byte[]? bytes, string? contentType)> FetchImageBytesAsync(string? source, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(source)) return (null, null);
        var s = source.Trim();

        // Prefer local uploads when possible
        var rel = ExtractUploadsRelativePath(s);
        if (rel != null)
        {
            try
            {
                var root = ResolveUploadsRoot();
                var rootFull = Path.GetFullPath(root);
                var full = Path.GetFullPath(Path.Combine(rootFull, rel));
                if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase)) return (null, null);
                if (!System.IO.File.Exists(full)) return (null, null);

                var bytes = await System.IO.File.ReadAllBytesAsync(full, ct);
                if (!ContentTypeProvider.TryGetContentType(full, out var contentType))
                {
                    contentType = "application/octet-stream";
                }
                return (bytes, contentType);
            }
            catch
            {
                // fall through to remote fetch
            }
        }

        // Absolute URL (e.g., Unsplash or legacy paths) -> download once and store
        if (Uri.TryCreate(s, UriKind.Absolute, out var abs) &&
            (abs.Scheme == Uri.UriSchemeHttp || abs.Scheme == Uri.UriSchemeHttps))
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                using var res = await client.GetAsync(abs, ct);
                if (!res.IsSuccessStatusCode) return (null, null);
                var bytes = await res.Content.ReadAsByteArrayAsync(ct);
                var ctHeader = res.Content.Headers.ContentType?.ToString();
                return (bytes, string.IsNullOrWhiteSpace(ctHeader) ? "application/octet-stream" : ctHeader);
            }
            catch
            {
                return (null, null);
            }
        }

        return (null, null);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? query = null, [FromQuery] string? kind = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = _db.Shows.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var s = query.Trim();
            q = q.Where(x => x.Title.ToLower().Contains(s.ToLower()) || (x.Description != null && x.Description.ToLower().Contains(s.ToLower())));
        }
        if (!string.IsNullOrWhiteSpace(kind))
        {
            q = q.Where(x => x.Kind.ToLower() == kind.ToLower());
        }
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var total = await q.CountAsync();

        var shows = await q
            .OrderBy(x => x.Title)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var changed = false;
        foreach (var show in shows)
        {
            if (show.ImageBytes == null && !string.IsNullOrWhiteSpace(show.ImageUrl))
            {
                var (bytes, contentType) = await FetchImageBytesAsync(show.ImageUrl);
                if (bytes != null && bytes.Length > 0)
                {
                    show.ImageBytes = bytes;
                    show.ImageContentType = contentType;
                    show.UpdatedAtUtc = DateTime.UtcNow;
                    changed = true;
                }
            }
        }
        if (changed)
        {
            await _db.SaveChangesAsync();
        }

        var items = shows.Select(show => new
        {
            slug = show.Slug,
            title = show.Title,
            kind = show.Kind,
            description = show.Description,
            imageUrl = show.ImageBytes != null ? BuildShowImageUrl(show.Slug) : Absolutize(show.ImageUrl),
            stableImageUrl = show.ImageBytes != null ? BuildShowImageUrl(show.Slug) : null,
            imageAltText = show.ImageAltText,
            imageCaption = show.ImageCaption,
            yearStart = show.YearStart,
            yearEnd = show.YearEnd,
            tags = show.Tags,
            createdAt = show.CreatedAtUtc,
        });

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug([FromRoute] string slug)
    {
        var show = await _db.Shows.Include(s => s.Trivias).FirstOrDefaultAsync(s => s.Slug == slug);
        if (show == null) return NotFound(new { message = "Not found" });

        if (show.ImageBytes == null && !string.IsNullOrWhiteSpace(show.ImageUrl))
        {
            var (bytes, contentType) = await FetchImageBytesAsync(show.ImageUrl);
            if (bytes != null && bytes.Length > 0)
            {
                show.ImageBytes = bytes;
                show.ImageContentType = contentType;
                show.UpdatedAtUtc = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        var quizzes = await _db.Quizzes
            .Where(q => q.ShowId == show.Id && q.Status == "published")
            .OrderByDescending(q => q.CreatedAtUtc)
            .Select(q => new {
                q.Slug,
                q.Title,
                q.Type,
                createdAt = q.CreatedAtUtc,
                q.ImageUrl,
                q.Description,
            })
            .ToListAsync();
        var imageUrl = show.ImageBytes != null
            ? BuildShowImageUrl(show.Slug)
            : Absolutize(show.ImageUrl);
        return Ok(new
        {
            slug = show.Slug,
            title = show.Title,
            kind = show.Kind,
            description = show.Description,
            imageUrl,
            stableImageUrl = show.ImageBytes != null ? imageUrl : null,
            imageAltText = show.ImageAltText,
            imageCaption = show.ImageCaption,
            yearStart = show.YearStart,
            yearEnd = show.YearEnd,
            tags = show.Tags,
            createdAt = show.CreatedAtUtc,
            trivias = show.Trivias.OrderBy(t => t.CreatedAtUtc).Select(t => new { id = t.Id, text = t.Text, imageUrl = t.ImageUrl, createdAt = t.CreatedAtUtc }),
            quizzes,
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ShowUpsertDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var baseSlug = Slugify(dto.Slug ?? dto.Title);
        // No 409: auto-resolve to a unique slug
        var slug = await EnsureUniqueShowSlugAsync(baseSlug);
        var show = new Show
        {
            Slug = slug,
            Title = dto.Title,
            Kind = string.IsNullOrWhiteSpace(dto.Kind) ? "TV" : dto.Kind,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            ImageAltText = dto.ImageAltText,
            ImageCaption = dto.ImageCaption,
            YearStart = dto.YearStart,
            YearEnd = dto.YearEnd,
            Tags = dto.Tags,
            CreatedAtUtc = DateTime.UtcNow,
        };

        var (bytes, contentType) = await FetchImageBytesAsync(dto.ImageUrl);
        show.ImageBytes = bytes;
        show.ImageContentType = contentType;

        _db.Shows.Add(show);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetBySlug), new { slug = show.Slug }, new { slug = show.Slug });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{slug}")]
    public async Task<IActionResult> Update([FromRoute] string slug, [FromBody] ShowUpsertDto dto)
    {
        // Be permissive for edits: coerce missing/blank fields to existing values
        var show = await _db.Shows.Include(s => s.Trivias).FirstOrDefaultAsync(s => s.Slug == slug);
        if (show == null) return NotFound(new { message = "Not found" });

        var title = string.IsNullOrWhiteSpace(dto.Title) ? show.Title : dto.Title.Trim();
        if (title.Length > 256) title = title.Substring(0, 256);
        var nextKind = string.IsNullOrWhiteSpace(dto.Kind) ? show.Kind : dto.Kind.Trim();
        if (nextKind.Length > 16) nextKind = nextKind.Substring(0, 16);
        var desc = dto.Description; // optional
        var img = dto.ImageUrl;     // may be relative or absolute
        var yStart = dto.YearStart;
        var yEnd = dto.YearEnd;
        var tags = dto.Tags;
        var altText = dto.ImageAltText;
        var caption = dto.ImageCaption;

        show.Title = title;
        show.Kind = nextKind;
        show.Description = desc;
        show.ImageUrl = img;
        show.ImageAltText = altText;
        show.ImageCaption = caption;
        show.YearStart = yStart;
        show.YearEnd = yEnd;
        show.Tags = tags;
        show.UpdatedAtUtc = DateTime.UtcNow;

        var (bytes, contentType) = await FetchImageBytesAsync(img);
        show.ImageBytes = bytes;
        show.ImageContentType = contentType;

        await _db.SaveChangesAsync();
        return Ok(new { slug = show.Slug });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete([FromRoute] string slug)
    {
        var show = await _db.Shows.FirstOrDefaultAsync(s => s.Slug == slug);
        if (show == null) return NotFound(new { message = "Not found" });
        _db.Shows.Remove(show);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{slug}/trivia")]
    public async Task<IActionResult> AddTrivia([FromRoute] string slug, [FromBody] ShowTriviaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text)) return BadRequest(new { message = "Text required" });
        var show = await _db.Shows.FirstOrDefaultAsync(s => s.Slug == slug);
        if (show == null) return NotFound(new { message = "Not found" });
        var trivia = new ShowTrivia { ShowId = show.Id, Text = dto.Text.Trim(), ImageUrl = dto.ImageUrl };
        _db.ShowTrivias.Add(trivia);
        await _db.SaveChangesAsync();
        return Ok(new { id = trivia.Id });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{slug}/trivia/{id}")]
    public async Task<IActionResult> DeleteTrivia([FromRoute] string slug, [FromRoute] Guid id)
    {
        var show = await _db.Shows.FirstOrDefaultAsync(s => s.Slug == slug);
        if (show == null) return NotFound(new { message = "Not found" });
        var trivia = await _db.ShowTrivias.FirstOrDefaultAsync(t => t.Id == id && t.ShowId == show.Id);
        if (trivia == null) return NotFound(new { message = "Trivia not found" });
        _db.ShowTrivias.Remove(trivia);
        await _db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpGet("{slug}/image")]
    public async Task<IActionResult> GetImage([FromRoute] string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return BadRequest(new { message = "Slug required" });
        }

        var show = await _db.Shows.AsNoTracking().FirstOrDefaultAsync(s => s.Slug == slug);
        if (show == null || show.ImageBytes == null || show.ImageBytes.Length == 0)
        {
            return NotFound(new { message = "Image not found" });
        }

        var contentType = string.IsNullOrWhiteSpace(show.ImageContentType)
            ? "application/octet-stream"
            : show.ImageContentType;

        Response.Headers["Cache-Control"] = "public, max-age=86400";
        return File(show.ImageBytes, contentType);
    }

    private static string Slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return Guid.NewGuid().ToString("n");
        var s = input.ToLowerInvariant();
        s = System.Text.RegularExpressions.Regex.Replace(s, "[^a-z0-9]+", "-");
        s = s.Trim('-');
        return string.IsNullOrWhiteSpace(s) ? Guid.NewGuid().ToString("n") : s;
    }

    private async Task<string> EnsureUniqueShowSlugAsync(string baseSlug)
    {
        if (string.IsNullOrWhiteSpace(baseSlug)) return Guid.NewGuid().ToString("n");
        var candidate = baseSlug;
        var suffix = 2;
        while (await _db.Shows.AsNoTracking().AnyAsync(s => s.Slug == candidate))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return candidate;
    }
}
