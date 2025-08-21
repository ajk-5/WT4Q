using System;
using System.Linq;
using System.Net;

namespace Northeast.Services;

internal static class AiFallbacks
{
    public static string MakeArticleHtml(AiArticleDraft d, int minWords, DateTimeOffset now, bool editorsNote = false)
    {
        var title = string.IsNullOrWhiteSpace(d.Title) ? "Update" : d.Title.Trim();
        var note = editorsNote && d.EventDateUtc is not null
            ? $"<p><em>Editor’s note: source events date to {d.EventDateUtc:yyyy-MM-dd}. Context update published {now:yyyy-MM-dd}.</em></p>"
            : "";

        var kws = (d.Keywords is { Count: > 0 })
            ? $"<p><strong>Keywords:</strong> {string.Join(", ", d.Keywords.Take(12))}.</p>"
            : "";

        var html = $@"<div>
<h2>Summary</h2>
<p>{WebUtility.HtmlEncode(title)} — quick context and key points.</p>
{note}
<h2>Details</h2>
<p>Background, recent developments, and why it matters for readers.</p>
<h2>What happens next</h2>
<p>We’ll watch for official updates and add confirmed information.</p>
{kws}
</div>";
        return ArticleMapping.EnsureHtmlDiv(html, minWords);
    }
}
