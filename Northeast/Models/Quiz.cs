using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models;

public class Quiz
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(160)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? Description { get; set; }

    [MaxLength(64)]
    public string? Category { get; set; }

    [MaxLength(32)]
    public string Type { get; set; } = "trivia";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? PublishedAtUtc { get; set; }

    [MaxLength(16)]
    public string Status { get; set; } = "published"; // draft|published

    [MaxLength(128)]
    public string? Author { get; set; }

    [MaxLength(1024)]
    public string? ImageUrl { get; set; }

    // Tags as Postgres text[]
    public string[]? Tags { get; set; }

    public bool Randomize { get; set; } = false;
    public int? TimeLimitSec { get; set; }
    public bool ShowExplanations { get; set; } = true;

    public List<QuizQuestion> Questions { get; set; } = new();

    // Optional linkage to a specific Show/Film/etc
    public Guid? ShowId { get; set; }
    public Show? Show { get; set; }
}
