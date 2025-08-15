using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;
using Northeast.Models;

namespace Northeast.Utilities
{
    /// <summary>
    /// Simple helper to prevent duplicate articles.
    /// </summary>
    public class Deduplication
    {
        private readonly AppDbContext _db;
        public Deduplication(AppDbContext db) => _db = db;

        public static string Fingerprint(string title, string url)
        {
            var norm = $"{title.Trim().ToLowerInvariant()}|{url.Trim().ToLowerInvariant()}";
            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(norm));
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        public async Task<bool> ExistsAsync(string title, string url, CancellationToken ct)
        {
            return await _db.Set<Article>()
                .AsNoTracking()
                .AnyAsync(a => a.Title.ToLower() == title.ToLower(), ct);
        }
    }
}
