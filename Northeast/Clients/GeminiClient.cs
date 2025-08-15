using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Northeast.Clients
{
    /// <summary>
    /// Minimal Gemini REST client. Calls /v1beta/models/{model}:generateContent.
    /// </summary>
    public class GeminiOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "models/gemini-2.0-flash";
        public double Temperature { get; set; } = 0.7;
        public int MaxOutputTokens { get; set; } = 1024;
    }

    public sealed class GeminiClient
    {
        private readonly HttpClient _http;
        private readonly GeminiOptions _opt;

        public GeminiClient(HttpClient http, IOptions<GeminiOptions> opt)
        {
            _http = http;
            _opt = opt.Value;
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
                },
                // NEW: thinkingConfig is supported for 2.5 models.
                // For Pro, thinking cannot be disabled; pick a reasonable budget to control cost.
                thinkingConfig = new
                {
                    thinkingBudget = 2048  // try 1024–4096 for paraphrasing/news; Pro allows up to ~32k
                }
            };

            var url = $"{modelPath}:generateContent?key={_opt.ApiKey}";
            using var resp = await _http.PostAsJsonAsync(url, body, ct);
            resp.EnsureSuccessStatusCode();

            var json = await resp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            var text = json
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? string.Empty;
        }
    }
}
