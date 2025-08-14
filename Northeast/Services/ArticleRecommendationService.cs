using Northeast.Models;
using Northeast.Repository;
using Northeast.Services.Similarity;

namespace Northeast.Services
{
    public interface IArticleRecommendationService
    {
        Task<IEnumerable<Article>> GetRecommendationsAsync(Guid articleId, int count);
    }

    public class ArticleRecommendationService : IArticleRecommendationService
    {
        private readonly ArticleRepository _repo;
        private readonly ISimilarityService _similarity;

        public ArticleRecommendationService(ArticleRepository repo, ISimilarityService similarity)
        {
            _repo = repo;
            _similarity = similarity;
        }

        public async Task<IEnumerable<Article>> GetRecommendationsAsync(Guid articleId, int count)
        {
            var source = await _repo.GetByIdAsync(articleId);
            if (source == null) return Enumerable.Empty<Article>();

            var candidates = await _repo.GetAllExceptAsync(articleId);

            return candidates
                .Select(a => new { Article = a, Score = _similarity.CalculateSimilarity(source, a) })
                .OrderByDescending(x => x.Score)
                .Take(count)
                .Select(x => x.Article)
                .ToList();
        }
    }
}
