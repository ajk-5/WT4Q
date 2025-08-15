using System;
using System.Collections.Generic;
using System.Linq;

namespace Northeast.Utilities
{
    public static class ContentBuilder
    {
        public static string BuildParaphrasePrompt(string title, string source, string url, string? summary, string categoryName)
        {
            return $@"You are a skilled human news writer. Paraphrase the story below into ORIGINAL copy.

Rules:
- Use simple, natural language (human tone).
- Output EXACTLY ONE HTML block: <div class=""article""> ... </div>
- Include a short intro and at least two <h2> sub-headings.
- Add a <h3>What's next?</h3> section with a clear, reasoned outlook.
- Minimum 170 words.
- Do NOT invent facts. If details are unclear, add a brief 'What we know so far' note.
- Add a line at the end: <meta data-keywords=""comma, separated, keywords""></meta>

Story facts:
Title: {title}
Source: {source}
Link: {url}
Category: {categoryName}
Summary (may be empty): {summary}

Now write the article (HTML only).";
        }

        public static string EnforceDiv(string html)
        {
            if (string.IsNullOrWhiteSpace(html)) return @"<div class=""article""><p>(empty)</p></div>";
            var trimmed = html.Trim();
            if (trimmed.StartsWith("<div", StringComparison.OrdinalIgnoreCase)) return trimmed;
            return $@"<div class=""article"">{html}</div>";
        }

        public static List<string> ExtractKeywords(string html)
        {
            var marker = "data-keywords=\"";
            var idx = html.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return new List<string>();
            var start = idx + marker.Length;
            var end = html.IndexOf('"', start);
            if (end <= start) return new List<string>();
            var csv = html.Substring(start, end - start);
            return csv.Split(',', StringSplitOptions.RemoveEmptyEntries)
                      .Select(k => k.Trim())
                      .Where(k => k.Length > 1)
                      .Distinct(StringComparer.OrdinalIgnoreCase)
                      .ToList();
        }
    }
}
