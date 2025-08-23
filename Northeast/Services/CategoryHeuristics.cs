using System.Linq;
using Northeast.Models;

namespace Northeast.Services;

internal static class CategoryHeuristics
{
    private static readonly string[] CrimeKeywords =
    {
        "crime", "police", "arrest", "investigation", "shooting", "stabbing", "homicide", "murder", "assault", "kidnapping", "fraud", "trafficking"
    };

    private static readonly string[] PoliticsKeywords =
    {
        "election", "president", "senate", "congress", "parliament", "minister", "government", "policy", "politic", "vote", "campaign", "candidate"
    };

    public static Category Guess(string? title, string? summary, string? content)
    {
        var text = string.Join(' ', title ?? string.Empty, summary ?? string.Empty, content ?? string.Empty)
            .ToLowerInvariant();

        if (CrimeKeywords.Any(k => text.Contains(k))) return Category.Crime;
        if (PoliticsKeywords.Any(k => text.Contains(k))) return Category.Politics;

        return Category.Info;
    }
}
