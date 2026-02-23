using System.ComponentModel.DataAnnotations;

namespace Northeast.Models;

public class ShowTrivia
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid ShowId { get; set; }
    public Show? Show { get; set; }

    [Required]
    [MaxLength(1024)]
    public string Text { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? ImageUrl { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

