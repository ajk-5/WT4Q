using Northeast.Models;

namespace Northeast.DTOs
{
 // <summary>
        /// Minimal payload for recommendation results. Extend as needed.
        /// </summary>
        public record ArticleRecommendationDto(
            Guid Id,
            string Title,
            string? CountryName,
            string? CountryCode,
            Category Category,
            ArticleType ArticleType,
            DateTime CreatedDate,
            string? Snippet,
            IEnumerable<string>? Keywords)
        {
            public static ArticleRecommendationDto FromModel(Article a) => new(
                a.Id,
                a.Title,
                a.CountryName,
                a.CountryCode,
                a.Category,
                a.ArticleType,
                a.CreatedDate,
                MakeSnippet(a.Content, 240),
                a.Keywords
            );

            private static string? MakeSnippet(string? text, int maxLen)
            {
                if (string.IsNullOrWhiteSpace(text)) return null;
                var s = text.Trim();
                if (s.Length <= maxLen) return s;
                // try not to cut mid-word
                var cut = s.LastIndexOf(' ', Math.Min(maxLen, s.Length - 1));
                if (cut <= 0) cut = maxLen;
                return s[..cut] + "…";
            }
        }
}
