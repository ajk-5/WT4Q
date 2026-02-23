using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models;

public class QuizQuestion
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid QuizId { get; set; }
    public Quiz? Quiz { get; set; }

    [Required]
    [MaxLength(1024)]
    public string Prompt { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? ImageUrl { get; set; }

    // Postgres text[] for choices
    public string[]? Choices { get; set; }

    [Required]
    [MaxLength(512)]
    public string Answer { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string? Explanation { get; set; }

    public int Points { get; set; } = 1;

    [MaxLength(16)]
    public string? Difficulty { get; set; }

    public int Order { get; set; } = 0;
}

