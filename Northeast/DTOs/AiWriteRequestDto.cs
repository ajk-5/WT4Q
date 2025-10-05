using System.ComponentModel.DataAnnotations;
using Northeast.Models;

namespace Northeast.DTOs
{
    public sealed class AiWriteRequestDto
    {
        [Required]
        public string Topic { get; set; } = string.Empty;

        [Required]
        public Category Category { get; set; }

        [Required]
        public ArticleType ArticleType { get; set; } = ArticleType.Article;

        // If true and ArticleType == News, attempt Google News-based recent paraphrase
        public bool UseRecentNews { get; set; } = false;

        // Optional locale hints for News
        public string? CountryName { get; set; }
        public string? CountryCode { get; set; }
    }
}

