using System.Text.RegularExpressions;

namespace Northeast.Utilities
{
    /// <summary>
    /// Helpers for basic HTML sanitizing and slug creation.
    /// </summary>
    public static class HtmlText
    {
        private static readonly Regex Tags = new("<.*?>", RegexOptions.Singleline | RegexOptions.Compiled);
        private static readonly Regex Ws = new(@"\s+", RegexOptions.Compiled);

        public static string Strip(string? html)
        {
            if (string.IsNullOrWhiteSpace(html)) return string.Empty;
            var t = Tags.Replace(html, " ");
            return Ws.Replace(t, " ").Trim();
        }

        public static string Slug(string input)
        {
            var s = input.ToLowerInvariant();
            s = Regex.Replace(s, "[^a-z0-9]+", "-");
            return s.Trim('-');
        }

        public static int CountWords(string? text)
        {
            var stripped = Strip(text);
            if (string.IsNullOrWhiteSpace(stripped)) return 0;
            return stripped.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;
        }
    }
}
