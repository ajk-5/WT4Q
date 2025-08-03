using Northeast.Models;
using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs
{
    public class ArticleDto
    {
        [Required]
        public string Title { get; set; }

        [Required]
        public Category Category { get; set; }

        [Required]
        public ArticleType ArticleType { get; set; }

        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        [Required]
        public string Description { get; set; }

        public bool IsBreakingNews { get; set; } = false;

        public List<byte[]>? Photo { get; set; }
        public string? PhotoLink { get; set; }
        public string? EmbededCode { get; set; }
        public string? AltText { get; set; }

        public string? CountryName { get; set; }

        public string? CountryCode { get; set; }

        public List<string>? Keyword { get; set; }

    }
}
