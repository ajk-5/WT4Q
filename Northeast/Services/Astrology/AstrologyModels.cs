using System.Collections.Generic;

namespace Northeast.Services.Astrology
{
    internal class HoroscopeOutlookModel
    {
        public string General { get; set; } = string.Empty;
        public string Love { get; set; } = string.Empty;
        public string Career { get; set; } = string.Empty;
        public string Wellness { get; set; } = string.Empty;
    }

    internal class HoroscopeRelationsModel
    {
        public string People { get; set; } = string.Empty;
        public string Pets { get; set; } = string.Empty;
        public string Planets { get; set; } = string.Empty;
        public string Stars { get; set; } = string.Empty;
        public string Stones { get; set; } = string.Empty;
    }

    internal class HoroscopeGuidanceModel
    {
        public string Ritual { get; set; } = string.Empty;
        public string Reflection { get; set; } = string.Empty;
        public string Adventure { get; set; } = string.Empty;
    }

    internal class SignHoroscopeModel
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string DateRange { get; set; } = string.Empty;
        public string Element { get; set; } = string.Empty;
        public string Modality { get; set; } = string.Empty;
        public string RulingPlanet { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string Headline { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Energy { get; set; } = string.Empty;
        public HoroscopeOutlookModel Outlook { get; set; } = new();
        public HoroscopeRelationsModel Relations { get; set; } = new();
        public HoroscopeGuidanceModel Guidance { get; set; } = new();
        public string Mood { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Mantra { get; set; } = string.Empty;
        public List<int> LuckyNumbers { get; set; } = new();
    }

    internal class DailyHoroscopeModel
    {
        public DateOnly ForDate { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
        public string Summary { get; set; } = string.Empty;
        public string CosmicWeather { get; set; } = string.Empty;
        public string LunarPhase { get; set; } = string.Empty;
        public string Highlight { get; set; } = string.Empty;
        public List<SignHoroscopeModel> Signs { get; set; } = new();
    }
}
