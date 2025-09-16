using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Northeast.Services.Astrology
{
    public class GeminiAstrologyClient
    {
        private readonly HttpClient _httpClient;
        private readonly AstrologyOptions _options;
        private readonly ILogger<GeminiAstrologyClient> _logger;

        private record GeminiResponse(GeminiCandidate[] Candidates);

        private record GeminiCandidate(GeminiContent Content);

        private record GeminiContent(GeminiPart[] Parts);

        private record GeminiPart(string Text);

        public class GeminiHoroscopePayload
        {
            public string GeneratedFor { get; set; } = string.Empty;
            public string Summary { get; set; } = string.Empty;
            public string CosmicWeather { get; set; } = string.Empty;
            public string LunarPhase { get; set; } = string.Empty;
            public string Highlight { get; set; } = string.Empty;
            public List<GeminiSignPayload> Signs { get; set; } = new();
        }

        public class GeminiSignPayload
        {
            public string Id { get; set; } = string.Empty;
            public string Headline { get; set; } = string.Empty;
            public string Summary { get; set; } = string.Empty;
            public string Energy { get; set; } = string.Empty;
            public HoroscopeOutlookModel Outlook { get; set; } = new();
            public HoroscopeRelationsModel Relations { get; set; } = new();
            public HoroscopeGuidanceModel Guidance { get; set; } = new();
            public string Mood { get; set; } = string.Empty;
            public string Color { get; set; } = string.Empty;
            public string Mantra { get; set; } = string.Empty;
            public List<int>? LuckyNumbers { get; set; }
        }

        public GeminiAstrologyClient(
            HttpClient httpClient,
            IOptions<AstrologyOptions> options,
            ILogger<GeminiAstrologyClient> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        private string BuildPrompt(DateOnly date)
        {
            var catalogue = string.Join(
                "\n",
                ZodiacCatalogue.All.Select(sign =>
                    string.Join(
                        '|',
                        new[]
                        {
                            sign.Id,
                            sign.Name,
                            sign.Element,
                            sign.Modality,
                            sign.RulingPlanet,
                            ZodiacCatalogue.FormatDateRange(sign),
                            string.Join(',', sign.Keywords)
                        })));

            return $@"You are the resident astrologer for an independent news organisation. Compose a richly-detailed daily horoscope for {date:yyyy-MM-dd}.
Focus on actionable, poetic and contemporary language. Mention practical guidance, energetic tone, and relational insights for people, pets, planets, stars and stones. Use inclusive language and avoid fatalistic statements.

For reference, here is the zodiac catalogue (id|name|element|modality|rulingPlanet|dateRange|keywords):
{catalogue}

Respond ONLY with valid JSON that matches this TypeScript definition exactly:
interface HoroscopeResponse {{
  generatedFor: string; // the provided date in YYYY-MM-DD format
  summary: string; // overall summary for all signs
  cosmicWeather: string; // planetary climate description
  lunarPhase: string; // mention the Moon influence
  highlight: string; // key takeaway for the day
  signs: {{
    id: string; // one of the ids from the catalogue
    headline: string; // short focus statement for the sign
    summary: string; // a 2-3 sentence synopsis
    energy: string; // energetic descriptor
    outlook: {{
      general: string;
      love: string;
      career: string;
      wellness: string;
    }};
    relations: {{
      people: string;
      pets: string;
      planets: string;
      stars: string;
      stones: string;
    }};
    guidance: {{
      ritual: string;
      reflection: string;
      adventure: string;
    }};
    mood: string;
    color: string;
    mantra: string;
    luckyNumbers: number[]; // 3-6 positive integers
  }}[];
}}
Ensure every zodiac sign from the catalogue appears once in the signs array (matching the order of the catalogue).
Do not include markdown fences or commentary.";
        }

        public async Task<GeminiHoroscopePayload> GenerateAsync(DateOnly date, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(_options.ApiKey))
            {
                throw new InvalidOperationException("Astrology: Gemini API key is not configured.");
            }

            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

            var requestPayload = new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[]
                        {
                            new { text = BuildPrompt(date) }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = _options.Temperature,
                    topP = _options.TopP,
                    topK = _options.TopK,
                    maxOutputTokens = _options.MaxOutputTokens,
                    responseMimeType = "application/json"
                }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(requestPayload),
                    Encoding.UTF8,
                    "application/json")
            };

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini astrology request failed: {Status} {Body}", response.StatusCode, content);
                throw new InvalidOperationException($"Gemini astrology request failed with status {(int)response.StatusCode}.");
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                throw new InvalidOperationException("Gemini astrology response was empty.");
            }

            GeminiResponse? parsed;
            try
            {
                parsed = JsonSerializer.Deserialize<GeminiResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse Gemini astrology envelope");
                throw new InvalidOperationException("Unable to parse Gemini astrology response envelope.", ex);
            }

            var text = parsed?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new InvalidOperationException("Gemini astrology response missing text content.");
            }

            var cleaned = text
                .Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
                .Replace("```", string.Empty, StringComparison.OrdinalIgnoreCase)
                .Trim();

            try
            {
                var payload = JsonSerializer.Deserialize<GeminiHoroscopePayload>(cleaned, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (payload == null || string.IsNullOrWhiteSpace(payload.GeneratedFor) || payload.Signs.Count == 0)
                {
                    throw new InvalidOperationException("Gemini astrology payload incomplete.");
                }

                return payload;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse Gemini astrology JSON {Json}", cleaned);
                throw new InvalidOperationException("Gemini astrology payload could not be parsed.", ex);
            }
        }
    }
}
