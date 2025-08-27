using System.Text.Json.Serialization;

namespace Northeast.Options
{
    public class IndexNowOptions
    {
        public bool Enabled { get; set; } = true;

        // The public host whose URLs you’re submitting (usually your frontend host)
        public string Host { get; set; } = "www.wt4q.com";

        // Your IndexNow key (must match the content of https://<Host>/<Key>.txt)
        public string Key { get; set; } = "";

        // Optional explicit key location. Leave null if your key file is at the root.
        public string? KeyLocation { get; set; }
        // URL template for articles. {slug} will be replaced. You can override in appsettings.
        public string ArticleUrlTemplate { get; set; } = "https://www.wt4q.com/articles/{slug}";

        // Endpoint (defaults to the IndexNow aggregator)
        public string Endpoint { get; set; } = "https://api.indexnow.org/indexnow";

        // Log-only on failure (default) vs. throw
        public bool ThrowOnFailure { get; set; } = false;
    }
}

