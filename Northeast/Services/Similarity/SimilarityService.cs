using Northeast.Models;

namespace Northeast.Services.Similarity
{
    public interface ISimilarityService
    {
        double CalculateSimilarity(Article a, Article b);
    }

    public class SimilarityService : ISimilarityService
    {
        private readonly ITokenizationService _tokenizer;

        public SimilarityService(ITokenizationService tokenizer)
        {
            _tokenizer = tokenizer;
        }

        public double CalculateSimilarity(Article a, Article b)
        {
            double score = 0;

            // Category / Type
            if (a.Category == b.Category) score += 1.0;
            if (a.ArticleType == b.ArticleType) score += 0.5;

            var tokensA = _tokenizer.CollectTokens(a);
            var tokensB = _tokenizer.CollectTokens(b);

            // Jaccard similarity
            var intersection = tokensA.Intersect(tokensB).Count();
            var union = tokensA.Union(tokensB).Count();
            if (union > 0)
                score += (double)intersection / union;

            return score;
        }
    }
}
