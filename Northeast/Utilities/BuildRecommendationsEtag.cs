using Northeast.Models;
using System.Security.Cryptography;
using System.Text;

namespace Northeast.Utilities
{
    public static class BuildRecommendationsEtag
    {
        public static string buildRecommendationsEtag(Guid id, int count, IReadOnlyList<Article> items)
        {
            var seed = $"{id:N}|{count}|" + string.Join("|", items.Select(a =>
                $"{a.Id:N}:{a.CreatedDate.Ticks}"));

            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(seed));
            var hex = Convert.ToHexString(hash);
            return $"W/\"{hex}\"";
        }
    }
}
