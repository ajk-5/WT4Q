using Northeast.Clients;
using Northeast.Models;
using Northeast.Utilities;

namespace Northeast.Services
{
    /// <summary>
    /// Builds Article entities using Gemini output.
    /// </summary>
    public class ArticleFactory
    {
        private readonly GeminiClient _gemini;
        public ArticleFactory(GeminiClient gemini) => _gemini = gemini;

        public async Task<Article> FromTrendingAsync(Guid authorId, Category category, string title, string source, string url, string? summary, CancellationToken ct)
        {
            var prompt = ContentBuilder.BuildParaphrasePrompt(title, source, url, summary, category.ToString());
            var html = await _gemini.GenerateAsync(prompt, ct);
            html = ContentBuilder.EnforceDiv(html);
            var keywords = ContentBuilder.ExtractKeywords(html);
            var imageLink = ImageLinkProvider.BuildRoyaltyFreeLink(string.Join(" ", keywords.DefaultIfEmpty(category.ToString())));
            var (alt, caption) = ImageLinkProvider.BuildMeta(title, url);

            return new Article
            {
                Id = Guid.NewGuid(),
                AuthorId = authorId,
                Title = title,
                Category = category,
                ArticleType = ArticleType.News,
                CreatedDate = DateTime.UtcNow,
                Content = html,
                IsBreakingNews = true,
                Images = new List<ArticleImage>
                {
                    new ArticleImage
                    {
                        Photo = null,
                        PhotoLink = imageLink,
                        AltText = alt,
                        Caption = caption
                    }
                },
                CountryName = null,
                CountryCode = null,
                Keywords = keywords
            };
        }

        public async Task<Article> FromRandomCategoryAsync(Guid authorId, Category category, CancellationToken ct)
        {
            var seedTitle = $"What's happening in {category} right now";
            var prompt = $@"Write a timely, original short article in simple words for the category: {category}.\nFollow the same HTML/output rules as before (div.article, h2 sub-headings, What's next, meta keywords).\nFocus on a current trend or explainer many readers ask this week. No fluff.";
            var html = await _gemini.GenerateAsync(prompt, ct);
            html = ContentBuilder.EnforceDiv(html);
            var keywords = ContentBuilder.ExtractKeywords(html);
            var imageLink = ImageLinkProvider.BuildRoyaltyFreeLink(string.Join(" ", keywords.DefaultIfEmpty(category.ToString())));
            var (alt, caption) = ImageLinkProvider.BuildMeta(seedTitle, "https://example.com");

            return new Article
            {
                Id = Guid.NewGuid(),
                AuthorId = authorId,
                Title = seedTitle,
                Category = category,
                ArticleType = ArticleType.Article,
                CreatedDate = DateTime.UtcNow,
                Content = html,
                IsBreakingNews = false,
                Images = new List<ArticleImage>
                {
                    new ArticleImage
                    {
                        Photo = null,
                        PhotoLink = imageLink,
                        AltText = alt,
                        Caption = caption
                    }
                },
                CountryName = null,
                CountryCode = null,
                Keywords = keywords
            };
        }
    }
}
