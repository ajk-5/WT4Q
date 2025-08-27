using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.Options;

namespace Northeast.Services
{
    public class IndexNowService : IIndexNowService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IndexNowOptions _opts;
        private readonly ILogger<IndexNowService> _logger;

        public IndexNowService(
            IHttpClientFactory httpClientFactory,
            IOptions<IndexNowOptions> options,
            ILogger<IndexNowService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _opts = options.Value;
            _logger = logger;
        }

        public string BuildArticleUrl(string slug)
        {
            if (string.IsNullOrWhiteSpace(slug))
                throw new ArgumentException("Slug cannot be empty.", nameof(slug));

            return _opts.ArticleUrlTemplate.Replace("{slug}", slug);
        }

        public Task SubmitArticleAsync(string slug, CancellationToken ct = default)
            => SubmitAsync(new[] { BuildArticleUrl(slug) }, ct);

        public async Task SubmitAsync(IEnumerable<string> urls, CancellationToken ct = default)
        {
            if (!_opts.Enabled)
            {
                _logger.LogDebug("IndexNow disabled via config. Skipping submit.");
                return;
            }
            if (string.IsNullOrWhiteSpace(_opts.Key))
            {
                _logger.LogWarning("IndexNow key is not configured. Skipping submit.");
                return;
            }
            if (string.IsNullOrWhiteSpace(_opts.Host))
            {
                _logger.LogWarning("IndexNow host is not configured. Skipping submit.");
                return;
            }

            var urlList = urls?.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct().ToArray() ?? Array.Empty<string>();
            if (urlList.Length == 0)
            {
                _logger.LogDebug("IndexNow submit called with no URLs. Skipping.");
                return;
            }

            var payload = new Dictionary<string, object?>
            {
                ["host"] = _opts.Host,
                ["key"] = _opts.Key,
                ["urlList"] = urlList
            };
            if (!string.IsNullOrWhiteSpace(_opts.KeyLocation))
                payload["keyLocation"] = _opts.KeyLocation;

            var options = new JsonSerializerOptions { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };
            var json = JsonSerializer.Serialize(payload, options);

            var client = _httpClientFactory.CreateClient("IndexNow");
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage res;
            try
            {
                res = await client.PostAsync(_opts.Endpoint, content, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IndexNow submit failed with network error for {Count} URLs", urlList.Length);
                if (_opts.ThrowOnFailure) throw;
                return;
            }

            if (res.StatusCode == HttpStatusCode.OK || res.StatusCode == HttpStatusCode.Accepted)
            {
                _logger.LogInformation("IndexNow accepted {Count} URL(s).", urlList.Length);
                return;
            }

            var body = await res.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("IndexNow failed: {Status} - {Body}", (int)res.StatusCode, body);

            if (_opts.ThrowOnFailure)
                throw new HttpRequestException($"IndexNow failed: {(int)res.StatusCode} {res.StatusCode} - {body}");
        }
    }
}

