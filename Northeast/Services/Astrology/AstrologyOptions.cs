namespace Northeast.Services.Astrology
{
    public class AstrologyOptions
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "gemini-1.5-flash";
        public double Temperature { get; set; } = 0.7;
        public double TopP { get; set; } = 0.9;
        public int TopK { get; set; } = 40;
        public int MaxOutputTokens { get; set; } = 2048;
        public string? DispatchToken { get; set; }
    }
}
