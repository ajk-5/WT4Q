using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models;

public class Show
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(160)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    // TV | Film | Music | Game | Other
    [MaxLength(16)]
    public string Kind { get; set; } = "TV";

    [MaxLength(1024)]
    public string? Description { get; set; }

    [MaxLength(1024)]
    public string? ImageUrl { get; set; }

    // Optional binary image stored directly in the database for durability
    public byte[]? ImageBytes { get; set; }

    // MIME type for ImageBytes (e.g., image/webp, image/jpeg)
    [MaxLength(128)]
    public string? ImageContentType { get; set; }

    // Optional metadata for the primary image
    [MaxLength(512)]
    public string? ImageAltText { get; set; }

    [MaxLength(1024)]
    public string? ImageCaption { get; set; }

    // e.g., 1994
    public int? YearStart { get; set; }
    // e.g., 2004 (null for single-year items)
    public int? YearEnd { get; set; }

    // Tags as Postgres text[]
    public string[]? Tags { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }

    public List<ShowTrivia> Trivias { get; set; } = new();
}
