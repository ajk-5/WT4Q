using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace Northeast.Clients
{
    /// <summary>
    /// Minimal Gemini REST client. Calls /v1beta/models/{model}:generateContent.
    /// </summary>
    public class GeminiOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "gemini-2.5-pro";
        public double Temperature { get; set; } = 0.7;
        public int MaxOutputTokens { get; set; } = 1024;
    }

    public sealed class GeminiClient
    {
        private readonly HttpClient _http;
        private readonly GeminiOptions _opt;
        private readonly ILogger<GeminiClient> _logger;

        public GeminiClient(HttpClient http, IOptions<GeminiOptions> opt, ILogger<GeminiClient> logger)
        {
            _http = http;
            _opt = opt.Value;
            _logger = logger;
            _http.BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/");
        }

        /// <summary>
        /// Calls the Gemini REST API with a simple text prompt and returns the text response.
        /// </summary>
        public async Task<string> GenerateAsync(string prompt, CancellationToken ct = default)
        {
            var modelPath = _opt.Model.StartsWith("models/")
                ? _opt.Model
                : $"models/{_opt.Model}";  // handles both "gemini-2.5-pro" and "models/gemini-2.5-pro"

            var body = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new
                {
                    temperature = _opt.Temperature,
                    maxOutputTokens = _opt.MaxOutputTokens
                }
                // thinkingConfig is not supported by the REST endpoint; use SDKs if needed.
            };

            var url = $"{modelPath}:generateContent?key={_opt.ApiKey}";
            using var resp = await _http.PostAsJsonAsync(url, body, ct);
            var respBody = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogError("Gemini error {Status}: {Body}", (int)resp.StatusCode, respBody);
                throw new HttpRequestException($"Gemini {resp.StatusCode}: {respBody}");
            }

            var json = JsonDocument.Parse(respBody);
            var text = json.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? string.Empty;
        }
    }
}
