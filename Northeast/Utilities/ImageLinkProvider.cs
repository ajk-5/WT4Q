namespace Northeast.Utilities
{
    /// <summary>
    /// Builds royalty-free image links (Unsplash source) with alt text and captions.
    /// </summary>
    public static class ImageLinkProvider
    {
        public static string BuildRoyaltyFreeLink(string query)
        {
            var q = Uri.EscapeDataString(query);
            return $"https://source.unsplash.com/featured/?{q}";
        }

        public static (string alt, string caption) BuildMeta(string title, string sourceUrl)
        {
            var alt = $"Illustration for: {title}";
            var caption = $"Royalty-free image (Unsplash). Source preview: {sourceUrl}";
            return (alt, caption);
        }
    }
}
