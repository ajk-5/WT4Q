using System.Collections.Generic;

namespace Northeast.Ai
{
    public class ArticleDto
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public List<string> Keywords { get; set; } = new List<string>();
        public string ImageUrl { get; set; }
        public string ImageAlt { get; set; }
        public string ImageCaption { get; set; }
        public string CountryName { get; set; }
        public string CountryCode { get; set; }
        public string CategoryName { get; set; }
        public Guid AuthorId { get; set; }
    }

    public class GeminiArticleResponse
    {
        public string Title { get; set; }
        public string Html { get; set; }
        public List<string> Keywords { get; set; }
        public string ImageUrl { get; set; }
        public string ImageAlt { get; set; }
        public string ImageCaption { get; set; }
        public string CountryName { get; set; }
        public string CountryCode { get; set; }
    }
}
