using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
using Northeast.Data;

namespace Northeast.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private static readonly FileExtensionContentTypeProvider ContentTypeProvider = new();

    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
        "image/pjpeg", "image/jfif"
    };

    private readonly AppDbContext _db;

    public MediaController(AppDbContext db)
    {
        _db = db;
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
            working = absolute.AbsolutePath;
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

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("upload")]
    [RequestSizeLimit(524_288_000)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });
        if (!AllowedImageContentTypes.Contains(file.ContentType))
            return BadRequest(new { message = "Unsupported file type" });

        var uploadsRoot = ResolveUploadsRoot();

        var now = DateTime.UtcNow;
        var subdir = Path.Combine(uploadsRoot, now.ToString("yyyy"), now.ToString("MM"));
        Directory.CreateDirectory(subdir);

        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = file.ContentType switch
            {
                "image/jpeg" or "image/jpg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/gif" => ".gif",
                _ => ".bin"
            };
        }
        var name = $"{Guid.NewGuid():n}{ext.ToLowerInvariant()}";
        var fullPath = Path.Combine(subdir, name);

        await using (var stream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 64 * 1024, useAsync: true))
        {
            await file.CopyToAsync(stream, ct);
        }

        var relativePath = $"/uploads/{now:yyyy}/{now:MM}/{name}";

        var scheme = HttpContext.Request.Scheme;
        if (HttpContext.Request.Headers.TryGetValue("X-Forwarded-Proto", out StringValues proto) && !StringValues.IsNullOrEmpty(proto))
            scheme = proto.ToString();
        var host = HttpContext.Request.Host.HasValue ? HttpContext.Request.Host.Value : string.Empty;
        if (HttpContext.Request.Headers.TryGetValue("X-Forwarded-Host", out StringValues fhost) && !StringValues.IsNullOrEmpty(fhost))
            host = fhost.ToString();
        var publicBase = string.IsNullOrWhiteSpace(host) ? null : $"{scheme}://{host}";
        var serveUrl = publicBase is null
            ? relativePath
            : $"{publicBase}/api/Media/raw?path={Uri.EscapeDataString(relativePath)}";
        var directUrl = publicBase is null ? relativePath : $"{publicBase}{relativePath}";

        return Ok(new { path = relativePath, url = serveUrl, uploadUrl = directUrl });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete]
    public IActionResult Delete([FromQuery] string? path)
    {
        var relative = ExtractUploadsRelativePath(path);
        if (relative is null) return BadRequest(new { message = "Invalid path" });

        var uploadsRoot = ResolveUploadsRoot();
        var rootFull = Path.GetFullPath(uploadsRoot);
        var full = Path.GetFullPath(Path.Combine(rootFull, relative));
        if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Invalid path" });
        if (!System.IO.File.Exists(full)) return NotFound(new { message = "File not found" });
        try
        {
            System.IO.File.Delete(full);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to delete", error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpGet("raw")]
    public IActionResult Raw([FromQuery] string? path)
    {
        var relative = ExtractUploadsRelativePath(path);
        if (relative is null) return BadRequest(new { message = "Invalid path" });

        var uploadsRoot = ResolveUploadsRoot();
        var rootFull = Path.GetFullPath(uploadsRoot);
        var full = Path.GetFullPath(Path.Combine(rootFull, relative));
        if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Invalid path" });
        if (!System.IO.File.Exists(full))
            return NotFound(new { message = "File not found" });

        if (!ContentTypeProvider.TryGetContentType(full, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        Response.Headers["Cache-Control"] = "public, max-age=86400";
        var stream = new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read);
        return File(stream, contentType);
    }

    private string? BuildServeUrl(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return null;
        var scheme = HttpContext.Request.Scheme;
        if (HttpContext.Request.Headers.TryGetValue("X-Forwarded-Proto", out StringValues proto) && !StringValues.IsNullOrEmpty(proto))
            scheme = proto.ToString();
        var host = HttpContext.Request.Host.HasValue ? HttpContext.Request.Host.Value : string.Empty;
        if (HttpContext.Request.Headers.TryGetValue("X-Forwarded-Host", out StringValues fhost) && !StringValues.IsNullOrEmpty(fhost))
            host = fhost.ToString();
        if (string.IsNullOrWhiteSpace(host)) return relativePath;
        return $"{scheme}://{host}/api/Media/raw?path={Uri.EscapeDataString(relativePath)}";
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("list")]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var refs = new List<(string RelativePath, string Source, string Key, string? Extra)>();

        var articleImages = await _db.ArticleImages
            .Select(ai => new { ai.Id, ai.PhotoLink, ArticleSlug = ai.Article.Slug })
            .ToListAsync();
        foreach (var ai in articleImages)
        {
            var rel = ExtractUploadsRelativePath(ai.PhotoLink);
            if (rel is null) continue;
            refs.Add((rel, "ArticleImage", ai.Id.ToString(), ai.ArticleSlug));
        }

        var shows = await _db.Shows
            .Select(s => new { s.Id, s.Slug, s.ImageUrl })
            .ToListAsync();
        foreach (var s in shows)
        {
            var rel = ExtractUploadsRelativePath(s.ImageUrl);
            if (rel is null) continue;
            refs.Add((rel, "Show", s.Slug, null));
        }

        var trivias = await _db.ShowTrivias
            .Select(t => new { t.Id, t.ShowId, t.ImageUrl })
            .ToListAsync();
        var showSlugById = shows.ToDictionary(s => s.Id, s => s.Slug);
        foreach (var t in trivias)
        {
            var rel = ExtractUploadsRelativePath(t.ImageUrl);
            if (rel is null) continue;
            showSlugById.TryGetValue(t.ShowId, out var slug);
            refs.Add((rel, "ShowTrivia", t.Id.ToString(), slug));
        }

        var quizzes = await _db.Quizzes
            .Select(q => new { q.Id, q.Slug, q.ImageUrl })
            .ToListAsync();
        foreach (var q in quizzes)
        {
            var rel = ExtractUploadsRelativePath(q.ImageUrl);
            if (rel is null) continue;
            refs.Add((rel, "Quiz", q.Slug, null));
        }

        var grouped = refs
            .GroupBy(r => r.RelativePath, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var relative = "/uploads/" + g.Key.Replace(Path.DirectorySeparatorChar, '/');
                return new
                {
                    relativePath = relative,
                    url = BuildServeUrl(relative),
                    referenceCount = g.Count(),
                    references = g.Select(r => new { r.Source, r.Key, slug = r.Extra }).ToList()
                };
            })
            .OrderByDescending(x => x.referenceCount)
            .ThenBy(x => x.relativePath)
            .ToList();

        var total = grouped.Count;
        var items = grouped
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new { total, page, pageSize, items });
    }
}

