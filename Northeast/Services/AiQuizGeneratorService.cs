using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Northeast.DTOs;

namespace Northeast.Services;

public sealed class AiQuizGeneratorService
{
    private static readonly string[] AllowedTypes = new[] { "trivia", "who-said-it", "finish-the-line" };

    private readonly ILogger<AiQuizGeneratorService> _log;
    private readonly IGenerativeTextClient _ai;
    private readonly AiNewsOptions _opts;

    public AiQuizGeneratorService(
        ILogger<AiQuizGeneratorService> log,
        IGenerativeTextClient ai,
        IOptions<AiNewsOptions> opts)
    {
        _log = log;
        _ai = ai;
        _opts = opts.Value;
    }

    public async Task<QuizUpsertDto?> GenerateAsync(QuizAiGenerateRequestDto request, CancellationToken ct)
    {
        var type = NormalizeQuizType(request.Type);
        var category = string.IsNullOrWhiteSpace(request.Category) ? "Entertainment" : request.Category.Trim();
        var questionCount = Math.Clamp(request.QuestionCount, 5, 20);

        if (GeminiRestClient.TryGetCooldown(out var wait, out var until))
        {
            _log.LogWarning(
                "Skipping AI quiz generation for topic '{Topic}' due to Gemini cooldown ({Wait:g}, until {Until:u}).",
                request.Topic, wait, until);
            return null;
        }

        var system = BuildSystemPrompt(type, questionCount);
        var user = BuildUserPrompt(request, type, category, questionCount);

        string payload;
        try
        {
            payload = await _ai.GenerateJsonAsync(_opts.Model, system, user, _opts.Creativity, ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "AI quiz generation failed for topic '{Topic}'.", request.Topic);
            return null;
        }

        var draft = DeserializeDraft(payload);
        if (draft == null || draft.Questions.Count == 0)
        {
            _log.LogWarning("AI quiz generation returned empty content for topic '{Topic}'.", request.Topic);
            return null;
        }

        var questions = draft.Questions
            .Select(MapQuestion)
            .Where(q => !string.IsNullOrWhiteSpace(q.Prompt) && !string.IsNullOrWhiteSpace(q.Answer))
            .Take(questionCount)
            .ToList();

        if (questions.Count == 0)
        {
            _log.LogWarning("AI quiz generation produced no valid questions for topic '{Topic}'.", request.Topic);
            return null;
        }

        for (var i = 0; i < questions.Count; i++)
        {
            questions[i].Order = i;
            if (questions[i].Points <= 0) questions[i].Points = 1;
            questions[i].Difficulty = NormalizeDifficulty(questions[i].Difficulty);
            var choices = questions[i].Choices;

            if ((type == "trivia" || type == "who-said-it") &&
                (choices == null || choices.Length < 2))
            {
                questions[i].Choices = BuildFallbackChoices(questions[i].Answer);
            }
        }

        var title = string.IsNullOrWhiteSpace(draft.Title)
            ? BuildFallbackTitle(request.Topic, type)
            : (draft.Title ?? string.Empty).Trim();

        var description = string.IsNullOrWhiteSpace(draft.Description)
            ? BuildFallbackDescription(request.Topic, type, questionCount)
            : (draft.Description ?? string.Empty).Trim();

        var tags = draft.Tags?
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToArray();

        if (tags == null || tags.Length == 0)
        {
            tags = new[]
            {
                "90s",
                "nostalgia",
                category.ToLowerInvariant(),
                type
            };
        }

        return new QuizUpsertDto
        {
            Title = title,
            Description = description,
            Category = category,
            Type = type,
            Author = "AI Editor",
            ImageUrl = draft.ImageUrl,
            Tags = tags,
            Randomize = true,
            TimeLimitSec = Math.Clamp(questionCount * 40, 180, 900),
            ShowExplanations = true,
            Status = request.Publish ? "published" : "draft",
            PublishedAtUtc = request.Publish ? DateTime.UtcNow : null,
            ShowId = request.ShowId,
            ShowSlug = request.ShowSlug,
            Questions = questions,
        };
    }

    private static QuizQuestionDto MapQuestion(AiQuizQuestionDraft q)
    {
        var choices = q.Choices ?? q.Options;
        var normalizedChoices = choices?
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToArray();

        return new QuizQuestionDto
        {
            Prompt = FirstNonEmpty(q.Prompt, q.Question) ?? string.Empty,
            ImageUrl = q.ImageUrl,
            Choices = normalizedChoices is { Length: > 0 } ? normalizedChoices : null,
            Answer = FirstNonEmpty(q.Answer, q.CorrectAnswer) ?? string.Empty,
            Explanation = q.Explanation,
            Points = q.Points.GetValueOrDefault(1),
            Difficulty = q.Difficulty,
        };
    }

    private static AiQuizDraft? DeserializeDraft(string raw)
    {
        var text = ExtractJsonObject(raw);
        var opts = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        try
        {
            return JsonSerializer.Deserialize<AiQuizDraft>(text, opts);
        }
        catch
        {
            return null;
        }
    }

    private static string ExtractJsonObject(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "{}";

        var text = raw.Trim();
        if (text.StartsWith("```", StringComparison.Ordinal))
        {
            text = text.Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
                       .Replace("```", string.Empty, StringComparison.OrdinalIgnoreCase)
                       .Trim();
        }

        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            return text[start..(end + 1)];
        }

        return text;
    }

    private static string BuildSystemPrompt(string type, int questionCount)
    {
        return
$@"You are a senior 90s pop-culture quiz editor.
Return STRICT JSON only. No markdown. No prose outside JSON.

Schema:
{{
  ""title"": ""string"",
  ""description"": ""string"",
  ""category"": ""string"",
  ""type"": ""trivia|who-said-it|finish-the-line"",
  ""imageUrl"": ""string|null"",
  ""tags"": [""string""],
  ""questions"": [
    {{
      ""prompt"": ""string"",
      ""choices"": [""string""],
      ""answer"": ""string"",
      ""explanation"": ""string"",
      ""points"": 1,
      ""difficulty"": ""easy|medium|hard""
    }}
  ]
}}

Hard rules:
- The quiz must be about 1990 to 1999 culture only.
- Type must be '{type}'.
- Produce exactly {questionCount} questions.
- Keep prompts concise and memorable.
- Avoid explicit/sexual content and modern references post-1999.
- Answers must be factually plausible.
- Use varied difficulty mix across the quiz.
- If choices are provided, include the correct answer among them.";
    }

    private static string BuildUserPrompt(
        QuizAiGenerateRequestDto request,
        string type,
        string category,
        int questionCount)
    {
        var topic = request.Topic.Trim();
        var titleHint = string.IsNullOrWhiteSpace(request.TitleHint) ? "none" : request.TitleHint.Trim();

        return
$@"Create a 90s nostalgia quiz.
Topic: {topic}
Category: {category}
Quiz type: {type}
Question count: {questionCount}
Title hint: {titleHint}

Focus on iconic 90s references (movies, TV, games, music, sports, brands, slang) matching this topic and category.
Return JSON only in the exact schema.";
    }

    private static string NormalizeQuizType(string? value)
    {
        var candidate = (value ?? string.Empty).Trim().ToLowerInvariant();
        if (AllowedTypes.Contains(candidate, StringComparer.Ordinal)) return candidate;
        return "trivia";
    }

    private static string? NormalizeDifficulty(string? value)
    {
        var v = (value ?? string.Empty).Trim().ToLowerInvariant();
        return v switch
        {
            "easy" => "easy",
            "hard" => "hard",
            _ => "medium"
        };
    }

    private static string BuildFallbackTitle(string topic, string type)
    {
        var label = type switch
        {
            "who-said-it" => "Who Said It",
            "finish-the-line" => "Finish the Line",
            _ => "Trivia Challenge"
        };

        return $"{topic.Trim()} - {label}";
    }

    private static string BuildFallbackDescription(string topic, string type, int count)
    {
        return $"A {count}-question 90s {type.Replace('-', ' ')} quiz on {topic.Trim()}.";
    }

    private static string[] BuildFallbackChoices(string answer)
    {
        var safe = string.IsNullOrWhiteSpace(answer) ? "Correct answer" : answer.Trim();
        return new[] { safe, "Option B", "Option C", "Option D" };
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }
        return null;
    }

    private sealed class AiQuizDraft
    {
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }

        [JsonPropertyName("tags")]
        public List<string>? Tags { get; set; }

        [JsonPropertyName("questions")]
        public List<AiQuizQuestionDraft> Questions { get; set; } = new();
    }

    private sealed class AiQuizQuestionDraft
    {
        [JsonPropertyName("prompt")]
        public string? Prompt { get; set; }

        [JsonPropertyName("question")]
        public string? Question { get; set; }

        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }

        [JsonPropertyName("choices")]
        public List<string>? Choices { get; set; }

        [JsonPropertyName("options")]
        public List<string>? Options { get; set; }

        [JsonPropertyName("answer")]
        public string? Answer { get; set; }

        [JsonPropertyName("correctAnswer")]
        public string? CorrectAnswer { get; set; }

        [JsonPropertyName("explanation")]
        public string? Explanation { get; set; }

        [JsonPropertyName("points")]
        public int? Points { get; set; }

        [JsonPropertyName("difficulty")]
        public string? Difficulty { get; set; }
    }
}
