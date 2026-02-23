using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs;

public class ShowUpsertDto
{
    public string? Slug { get; set; }
    [Required]
    [MaxLength(256)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(16)]
    public string Kind { get; set; } = "TV"; // TV | Film | Music | Game | Other
    [MaxLength(1024)]
    public string? Description { get; set; }
    [MaxLength(1024)]
    public string? ImageUrl { get; set; }
    [MaxLength(512)]
    public string? ImageAltText { get; set; }
    [MaxLength(1024)]
    public string? ImageCaption { get; set; }
    public int? YearStart { get; set; }
    public int? YearEnd { get; set; }
    public string[]? Tags { get; set; }
}

public class ShowTriviaDto
{
    public Guid? Id { get; set; }
    [Required]
    [MaxLength(1024)]
    public string Text { get; set; } = string.Empty;
    [MaxLength(1024)]
    public string? ImageUrl { get; set; }
}
