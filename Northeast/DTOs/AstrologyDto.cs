namespace Northeast.DTOs
{
    public class HoroscopeOutlookDto
    {
        public string General { get; set; } = string.Empty;
        public string Love { get; set; } = string.Empty;
        public string Career { get; set; } = string.Empty;
        public string Wellness { get; set; } = string.Empty;
    }

    public class HoroscopeRelationsDto
    {
        public string People { get; set; } = string.Empty;
        public string Pets { get; set; } = string.Empty;
        public string Planets { get; set; } = string.Empty;
        public string Stars { get; set; } = string.Empty;
        public string Stones { get; set; } = string.Empty;
    }

    public class HoroscopeGuidanceDto
    {
        public string Ritual { get; set; } = string.Empty;
        public string Reflection { get; set; } = string.Empty;
        public string Adventure { get; set; } = string.Empty;
    }

    public class AstrologySignDto
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
        public HoroscopeOutlookDto Outlook { get; set; } = new();
        public HoroscopeRelationsDto Relations { get; set; } = new();
        public HoroscopeGuidanceDto Guidance { get; set; } = new();
        public string Mood { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Mantra { get; set; } = string.Empty;
        public IReadOnlyList<int> LuckyNumbers { get; set; } = Array.Empty<int>();
    }

    public class DailyHoroscopeDto
    {
        public string GeneratedFor { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }

        public string Summary { get; set; } = string.Empty;
        public string CosmicWeather { get; set; } = string.Empty;
        public string LunarPhase { get; set; } = string.Empty;
        public string Highlight { get; set; } = string.Empty;
        public IReadOnlyList<AstrologySignDto> Signs { get; set; } = Array.Empty<AstrologySignDto>();
    }

    public class AstrologySubscriptionDto
    {
        public string SignId { get; set; } = string.Empty;
        public string? SignName { get; set; }
        public string? CountryCode { get; set; }
        public string TimeZone { get; set; } = "UTC";
        public int SendHour { get; set; }
        public string? LastSentLocalDate { get; set; }
        public bool Active { get; set; }
        public string? UserName { get; set; }
    }

    public class AstrologySubscriptionRequest
    {
        public string SignId { get; set; } = string.Empty;
        public string? CountryCode { get; set; }
        public string TimeZone { get; set; } = "UTC";
        public int SendHour { get; set; } = 5;
    }

    public class AstrologyDispatchReportDto
    {
        public int Sent { get; set; }
        public int Attempted { get; set; }
        public int Skipped { get; set; }
        public int Pending { get; set; }
        public List<AstrologyDispatchDetailDto> Detail { get; set; } = new();
    }

    public class AstrologyDispatchDetailDto
    {
        public string Email { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }
}
