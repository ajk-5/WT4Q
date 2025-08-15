
using Northeast.Models;

namespace Northeast.DTOs
{
    public class ArticleRecommendationDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public Category Category { get; set; }
        public ArticleType ArticleType { get; set; }
    }
}