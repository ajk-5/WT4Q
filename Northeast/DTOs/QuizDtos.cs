using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs;

public class QuizQuestionDto
{
    public Guid? Id { get; set; }
    [Required]
    public string Prompt { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string[]? Choices { get; set; }
    [Required]
    public string Answer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public int Points { get; set; } = 1;
    public string? Difficulty { get; set; }
    public int Order { get; set; }
}

public class QuizUpsertDto
{
    public string? Slug { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    [Required]
    public string Type { get; set; } = "trivia";
    public string? Author { get; set; }
    public string? ImageUrl { get; set; }
    public string[]? Tags { get; set; }
    public bool? Randomize { get; set; }
    public int? TimeLimitSec { get; set; }
    public bool? ShowExplanations { get; set; }
    public string? Status { get; set; }
    public DateTime? PublishedAtUtc { get; set; }

    // Optional link to a show (by slug or id)
    public string? ShowSlug { get; set; }
    public Guid? ShowId { get; set; }

    [MinLength(1)]
    public List<QuizQuestionDto> Questions { get; set; } = new();
}

public class QuizAiGenerateRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Topic { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string Type { get; set; } = "trivia";

    [MaxLength(64)]
    public string? Category { get; set; }

    [Range(5, 20)]
    public int QuestionCount { get; set; } = 10;

    [MaxLength(256)]
    public string? TitleHint { get; set; }

    public string? ShowSlug { get; set; }
    public Guid? ShowId { get; set; }

    public bool Publish { get; set; }
}

public class QuizAiGenerateResponseDto
{
    [Required]
    public QuizUpsertDto Quiz { get; set; } = new();

    public bool Published { get; set; }
    public string? Slug { get; set; }
}
