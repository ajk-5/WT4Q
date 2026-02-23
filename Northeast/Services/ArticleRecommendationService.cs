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
            if (candidates.Count == 0) return Enumerable.Empty<Article>();

            var scored = new List<(Article Article, double Score)>(candidates.Count);
            foreach (var candidate in candidates)
            {
                try
                {
                    scored.Add((candidate, _similarity.CalculateSimilarity(source, candidate)));
                }
                catch
                {
                    // Keep recommendations resilient when one record has malformed text.
                }
            }

            if (scored.Count == 0)
            {
                return candidates
                    .OrderByDescending(a => a.CreatedDate)
                    .Take(count)
                    .ToList();
            }

            var top = scored
                .OrderByDescending(x => x.Score)
                .Take(count)
                .Select(x => x.Article)
                .ToList();

            if (top.Count >= count)
            {
                return top;
            }

            var selectedIds = top.Select(x => x.Id).ToHashSet();
            var fillers = candidates
                .Where(a => !selectedIds.Contains(a.Id))
                .OrderByDescending(a => a.CreatedDate)
                .Take(count - top.Count);

            top.AddRange(fillers);
            return top;
        }
    }
}
