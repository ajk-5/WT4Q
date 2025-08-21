using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Northeast.Configuration;
using Northeast.Ai;

namespace Northeast.Services
{
    public class AiArticleGenerator
    {
        private readonly IGeminiClient _geminiClient;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AiNewsOptions _options;
        private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        public AiArticleGenerator(IGeminiClient geminiClient, IHttpClientFactory httpClientFactory, IOptions<AiNewsOptions> options)
        {
            _geminiClient = geminiClient;
            _httpClientFactory = httpClientFactory;
            _options = options.Value;
        }

        public async Task<ArticleDto> GenerateTrendingArticleAsync(CancellationToken cancellationToken = default)
        {
            string topicTitle = null;
            string topicDescription = null;
            try
            {
                var newsClient = _httpClientFactory.CreateClient("News");
                string requestUrl = $"latest-news?apiKey={_options.NewsApiKey}&language=en";
                var response = await newsClient.GetAsync(requestUrl, cancellationToken);
                response.EnsureSuccessStatusCode();
                string newsJson = await response.Content.ReadAsStringAsync(cancellationToken);
                using (JsonDocument doc = JsonDocument.Parse(newsJson))
                {
                    JsonElement root = doc.RootElement;
                    JsonElement articles;
                    if (root.TryGetProperty("news", out articles) || root.TryGetProperty("articles", out articles))
                    {
                        if (articles.ValueKind == JsonValueKind.Array && articles.GetArrayLength() > 0)
                        {
                            JsonElement firstArticle = articles[0];
                            if (firstArticle.TryGetProperty("title", out JsonElement titleElem))
                                topicTitle = titleElem.GetString();
                            if (firstArticle.TryGetProperty("description", out JsonElement descElem))
                                topicDescription = descElem.GetString();
                        }
                    }
                }
            }
            catch
            {
                return null;
            }

            if (string.IsNullOrEmpty(topicTitle))
            {
                return null;
            }

            string prompt;
            if (!string.IsNullOrEmpty(topicDescription))
            {
                prompt = $"Write a news article about the following story: {topicTitle} - {topicDescription}. " +
                         $"Provide the article in HTML format with a structured <div> container, including <h2>/<h3> sub-headings and a final section titled 'What happens next'. " +
                         $"Also provide 5-12 relevant keywords, and suggest a suitable royalty-free image with an alt text and caption. " +
                         $"If the story is global, set countryName and countryCode to null in the output.";
            }
            else
            {
                prompt = $"Write a detailed news article about \"{topicTitle}\". " +
                         $"Provide the article in HTML format with a structured <div> container, including <h2>/<h3> sub-headings and a final section titled 'What happens next'. " +
                         $"Include 5-12 relevant keywords and suggest a suitable royalty-free image with alt text and caption. " +
                         $"If the story is global, set countryName and countryCode to null.";
            }

            GeminiArticleResponse aiResponse;
            try
            {
                aiResponse = await _geminiClient.GenerateArticleAsync(prompt, cancellationToken);
            }
            catch
            {
                return null;
            }

            ArticleDto article = await PrepareArticleDto(aiResponse);
            if (article != null)
            {
                article.CategoryName = "Trending";
            }
            return article;
        }

        public async Task<ArticleDto> GenerateRandomArticleAsync(string categoryName, CancellationToken cancellationToken = default)
        {
            string prompt = $"Write a detailed news article on a random topic in the category \"{categoryName}\". " +
                            $"Provide the article as HTML within a structured <div>, use appropriate <h2>/<h3> sub-headings, and end with a section titled 'What happens next'. " +
                            $"Include 5-12 relevant keywords and suggest a fitting royalty-free image with alt text and caption. " +
                            $"If the article topic is global, set countryName and countryCode to null.";
            GeminiArticleResponse aiResponse;
            try
            {
                aiResponse = await _geminiClient.GenerateArticleAsync(prompt, cancellationToken);
            }
            catch
            {
                return null;
            }

            ArticleDto article = await PrepareArticleDto(aiResponse);
            if (article != null)
            {
                article.CategoryName = categoryName;
            }
            return article;
        }

        public async Task<ArticleDto> GenerateHorrorArticleAsync(CancellationToken cancellationToken = default)
        {
            string prompt = "Write a true crime horror story of around 500 words. " +
                            "Provide the story in HTML format inside a <div>, with multiple sections using <h2> and <h3> sub-headings, and conclude with a section titled 'What happens next'. " +
                            "Include 5-12 relevant keywords and suggest a fitting royalty-free image with alt text and caption. " +
                            "If the story is global or fictional, set countryName and countryCode to null.";
            GeminiArticleResponse aiResponse;
            try
            {
                aiResponse = await _geminiClient.GenerateArticleAsync(prompt, cancellationToken);
            }
            catch
            {
                return null;
            }

            ArticleDto article = await PrepareArticleDto(aiResponse);
            if (article != null)
            {
                article.CategoryName = "True Crime";
            }
            return article;
        }

        private async Task<ArticleDto> PrepareArticleDto(GeminiArticleResponse aiResponse)
        {
            if (aiResponse == null) return null;
            ArticleDto article = new ArticleDto
            {
                Title = aiResponse.Title?.Trim(),
                Content = aiResponse.Html,
                Keywords = aiResponse.Keywords ?? new List<string>(),
                ImageUrl = aiResponse.ImageUrl,
                ImageAlt = aiResponse.ImageAlt,
                ImageCaption = aiResponse.ImageCaption,
                CountryName = aiResponse.CountryName,
                CountryCode = aiResponse.CountryCode
            };

            int wordCount = CountWords(article.Content);
            if (wordCount < _options.AbsoluteMinWordCount)
            {
                return null;
            }
            if (!Regex.IsMatch(article.Content ?? string.Empty, @"What happens next", RegexOptions.IgnoreCase))
            {
            }

            HashSet<string> seen = new HashSet<string>();
            List<string> finalKeywords = new List<string>();
            foreach (string kw in article.Keywords)
            {
                if (string.IsNullOrWhiteSpace(kw)) continue;
                string term = kw.Trim().ToLowerInvariant();
                if (term.Length == 0 || seen.Contains(term)) continue;
                seen.Add(term);
                finalKeywords.Add(term);
                if (finalKeywords.Count == 12) break;
            }
            article.Keywords = finalKeywords;

            if (!string.IsNullOrEmpty(article.CountryName) && article.CountryName.Equals("global", StringComparison.OrdinalIgnoreCase))
            {
                article.CountryName = null;
                article.CountryCode = null;
            }

            if (_options.EnableImageFetching)
            {
                bool haveImage = !string.IsNullOrEmpty(article.ImageUrl);
                if (haveImage)
                {
                    try
                    {
                        var uri = new Uri(article.ImageUrl);
                        string host = uri.Host.ToLowerInvariant();
                        bool allowed = host.Contains("wikipedia.org") || host.Contains("wikimedia.org") ||
                                       host.Contains("pixabay.com") || host.Contains("unsplash.com") || host.Contains("pexels.com");
                        if (!allowed)
                        {
                            haveImage = false;
                            article.ImageUrl = null;
                            article.ImageAlt = null;
                            article.ImageCaption = null;
                        }
                    }
                    catch
                    {
                        haveImage = false;
                        article.ImageUrl = null;
                        article.ImageAlt = null;
                        article.ImageCaption = null;
                    }
                }
                if (!haveImage)
                {
                    var imageInfo = await FetchImageFromWikiAsync(article.Title, article.Keywords);
                    if (imageInfo != null)
                    {
                        article.ImageUrl = imageInfo.Value.Url;
                        article.ImageAlt = imageInfo.Value.Alt;
                        article.ImageCaption = imageInfo.Value.Caption;
                    }
                }
            }

            return article;
        }

        private async Task<(string Url, string Alt, string Caption)?> FetchImageFromWikiAsync(string title, List<string> keywords)
        {
            var wikiClient = _httpClientFactory.CreateClient("Wiki");
            string imageUrl = null;
            try
            {
                var res = await wikiClient.GetAsync($"api.php?action=query&titles={Uri.EscapeDataString(title)}&prop=pageimages&format=json&piprop=original", CancellationToken.None);
                res.EnsureSuccessStatusCode();
                string wikiJson = await res.Content.ReadAsStringAsync();
                using (JsonDocument doc = JsonDocument.Parse(wikiJson))
                {
                    if (doc.RootElement.TryGetProperty("query", out JsonElement qry) &&
                        qry.TryGetProperty("pages", out JsonElement pages))
                    {
                        foreach (JsonProperty page in pages.EnumerateObject())
                        {
                            JsonElement pageInfo = page.Value;
                            if (pageInfo.TryGetProperty("original", out JsonElement orig) && orig.TryGetProperty("source", out JsonElement src))
                            {
                                imageUrl = src.GetString();
                            }
                        }
                    }
                }
            }
            catch { }

            if (imageUrl == null && keywords != null && keywords.Count > 0)
            {
                string searchTerm = keywords[0];
                try
                {
                    var searchRes = await wikiClient.GetAsync($"api.php?action=query&list=search&srsearch={Uri.EscapeDataString(searchTerm)}&format=json&srlimit=1", CancellationToken.None);
                    searchRes.EnsureSuccessStatusCode();
                    string searchJson = await searchRes.Content.ReadAsStringAsync();
                    string foundTitle = null;
                    using (JsonDocument searchDoc = JsonDocument.Parse(searchJson))
                    {
                        if (searchDoc.RootElement.TryGetProperty("query", out JsonElement qry) &&
                            qry.TryGetProperty("search", out JsonElement results) &&
                            results.ValueKind == JsonValueKind.Array && results.GetArrayLength() > 0)
                        {
                            foundTitle = results[0].GetProperty("title").GetString();
                        }
                    }
                    if (!string.IsNullOrEmpty(foundTitle))
                    {
                        var imgRes = await wikiClient.GetAsync($"api.php?action=query&titles={Uri.EscapeDataString(foundTitle)}&prop=pageimages&format=json&piprop=original", CancellationToken.None);
                        imgRes.EnsureSuccessStatusCode();
                        string imgJson = await imgRes.Content.ReadAsStringAsync();
                        using (JsonDocument imgDoc = JsonDocument.Parse(imgJson))
                        {
                            if (imgDoc.RootElement.TryGetProperty("query", out JsonElement qry2) &&
                                qry2.TryGetProperty("pages", out JsonElement pages2))
                            {
                                foreach (JsonProperty page in pages2.EnumerateObject())
                                {
                                    JsonElement pageInfo = page.Value;
                                    if (pageInfo.TryGetProperty("original", out JsonElement orig) && orig.TryGetProperty("source", out JsonElement src))
                                    {
                                        imageUrl = src.GetString();
                                    }
                                }
                            }
                        }
                    }
                }
                catch { }
            }

            if (imageUrl != null)
            {
                string altText = title;
                string caption = title;
                return (imageUrl, altText, caption);
            }
            return null;
        }

        private int CountWords(string htmlContent)
        {
            if (string.IsNullOrWhiteSpace(htmlContent)) return 0;
            string text = Regex.Replace(htmlContent, "<[^>]+>", " ");
            string[] words = text.Split(new char[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries);
            return words.Length;
        }
    }
}
