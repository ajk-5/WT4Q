namespace Northeast.Configuration
{
    public class AiNewsOptions
    {
        public string GeminiApiUrl { get; set; }
        public string GeminiApiKey { get; set; }
        public string GeminiModel { get; set; }
        public string NewsApiKey { get; set; }
        public TimeSpan TrendingInterval { get; set; } = TimeSpan.FromMinutes(5);
        public TimeSpan RandomInterval { get; set; } = TimeSpan.FromMinutes(15);
        public TimeSpan HorrorInterval { get; set; } = TimeSpan.FromHours(1);
        public int PreferredMinWordCount { get; set; } = 160;
        public int AbsoluteMinWordCount { get; set; } = 60;
        public bool EnableTrending { get; set; } = true;
        public bool EnableRandom { get; set; } = true;
        public bool EnableHorror { get; set; } = true;
        public bool EnableImageFetching { get; set; } = true;
    }
}
