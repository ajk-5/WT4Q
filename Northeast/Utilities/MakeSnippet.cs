namespace Northeast.Utilities
{
    public static class MakeSnippet
    {
        private static string? makeSnippet(string? text, int maxLen)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var s = text.Trim();
            if (s.Length <= maxLen) return s;
            // try not to cut mid-word
            var cut = s.LastIndexOf(' ', Math.Min(maxLen, s.Length - 1));
            if (cut <= 0) cut = maxLen;
            return s[..cut] + "…";
        }
    }
}
