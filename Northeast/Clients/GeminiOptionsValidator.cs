using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Northeast.Clients
{
    /// <summary>
    /// Validates <see cref="GeminiOptions"/> at application startup to ensure a known model name is used.
    /// </summary>
    public class GeminiOptionsValidator : IValidateOptions<GeminiOptions>
    {
        private readonly ILogger<GeminiOptionsValidator> _logger;

        private static readonly HashSet<string> AllowedModels = new(StringComparer.OrdinalIgnoreCase)
        {
            "gemini-pro",
            "gemini-pro-vision",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-1.5-pro-latest"
        };

        public GeminiOptionsValidator(ILogger<GeminiOptionsValidator> logger)
        {
            _logger = logger;
        }

        public ValidateOptionsResult Validate(string? name, GeminiOptions options)
        {
            var model = options.Model;
            if (model.StartsWith("models/"))
            {
                model = model["models/".Length..];
            }

            if (!AllowedModels.Contains(model))
            {
                _logger.LogError("Invalid Gemini model configured: {Model}", options.Model);
                return ValidateOptionsResult.Fail($"Invalid Gemini model '{options.Model}'.");
            }

            return ValidateOptionsResult.Success;
        }
    }
}
