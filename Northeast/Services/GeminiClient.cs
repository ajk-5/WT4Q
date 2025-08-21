using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Northeast.Configuration;
using Northeast.Ai;

namespace Northeast.Services
{
    public interface IGeminiClient
    {
        Task<GeminiArticleResponse> GenerateArticleAsync(string prompt, CancellationToken cancellationToken = default);
    }

    public class GeminiClient : IGeminiClient
    {
        private readonly HttpClient _httpClient;
        private readonly AiNewsOptions _options;
        private readonly JsonSerializerOptions _jsonOptions;

        public GeminiClient(HttpClient httpClient, IOptions<AiNewsOptions> options)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        }

        public async Task<GeminiArticleResponse> GenerateArticleAsync(string prompt, CancellationToken cancellationToken = default)
        {
            var requestBody = new
            {
                model = _options.GeminiModel,
                prompt = prompt
            };
            string jsonRequest = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.PostAsync(string.Empty, content, cancellationToken);
            }
            catch (Exception)
            {
                throw;
            }

            if (!response.IsSuccessStatusCode)
            {
                response.EnsureSuccessStatusCode();
            }

            string responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

            GeminiArticleResponse result;
            try
            {
                result = JsonSerializer.Deserialize<GeminiArticleResponse>(responseJson, _jsonOptions);
            }
            catch (JsonException ex)
            {
                throw new Exception("Failed to parse Gemini API response.", ex);
            }

            return result;
        }
    }
}
