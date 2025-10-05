using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using System.Threading.RateLimiting;
using Northeast.Services;

namespace Northeast.Clients
{
    /// <summary>
    /// Minimal Gemini REST client. Calls /v1/models/{model}:generateContent.
    /// </summary>
    public class GeminiOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "gemini-1.5-flash-latest";
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
            _http.BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1/");
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
            var attempt = 0;
            var maxAttempts = 2;

            while (true)
            {
                attempt++;
                await AiGlobalRateLimiter.WaitPacingAsync(ct);
                using var lease = await AiGlobalRateLimiter.AcquireAsync(1, ct);
                if (!lease.IsAcquired) throw new Exception("Global AI rate limit exceeded (queue full)");

                using var resp = await _http.PostAsJsonAsync(url, body, ct);
                var respBody = await resp.Content.ReadAsStringAsync(ct);
                if (!resp.IsSuccessStatusCode)
                {
                    var code = (int)resp.StatusCode;
                    if ((code == 429 || code >= 500) && attempt < maxAttempts)
                    {
                        var baseDelay = resp.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(AiGlobalRateLimiter.MinSpacingSeconds);
                        var jitter = TimeSpan.FromSeconds(new Random().Next(1, 4));
                        var delay = baseDelay + jitter;
                        if (code == 429)
                            await AiGlobalRateLimiter.ApplyCooldownOn429Async(ct);
                        await AiGlobalRateLimiter.BumpSpacingAsync(delay + TimeSpan.FromSeconds(2), ct);
                        await Task.Delay(delay, ct);
                        continue;
                    }
                    _logger.LogError("Gemini error {Status}: {Body}", (int)resp.StatusCode, respBody);
                    throw new HttpRequestException($"Gemini {resp.StatusCode}: {respBody}");
                }

                await AiGlobalRateLimiter.BumpSpacingAsync(TimeSpan.FromSeconds(AiGlobalRateLimiter.MinSpacingSeconds), ct);

                var json = JsonDocument.Parse(respBody);
                if (json.RootElement.TryGetProperty("candidates", out var candidates)
                    && candidates.ValueKind == JsonValueKind.Array && candidates.GetArrayLength() > 0)
                {
                    var candidate = candidates[0];
                    if (candidate.TryGetProperty("content", out var content)
                        && content.TryGetProperty("parts", out var parts)
                        && parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
                    {
                        var text = parts[0].GetProperty("text").GetString();
                        return text ?? string.Empty;
                    }
                }

                _logger.LogError("Gemini response missing text: {Body}", respBody);
                return string.Empty;
            }
        }
    }
}
