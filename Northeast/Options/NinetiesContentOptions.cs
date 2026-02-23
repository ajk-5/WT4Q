namespace Northeast.Options
{
    public sealed class NinetiesContentOptions
    {
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// How often the scheduler wakes up to check whether content is due.
        /// </summary>
        public int IntervalMinutes { get; set; } = 10;

        /// <summary>
        /// Generate a jokes article every N hours.
        /// </summary>
        public int JokesIntervalHours { get; set; } = 1;

        /// <summary>
        /// Time zone for daily schedules (accepts IANA or Windows IDs).
        /// </summary>
        public string TimeZoneId { get; set; } = "America/New_York";

        /// <summary>
        /// Local times to publish "On This Day in the 90s" articles (HH:mm).
        /// </summary>
        public string[] OnThisDayLocalTimes { get; set; } = new[] { "09:00", "18:00" };

        /// <summary>
        /// Local times to publish "Blast from the Past" articles (HH:mm).
        /// </summary>
        public string[] BlastFromPastLocalTimes { get; set; } = new[] { "12:00", "21:00" };

        // Legacy/unused in the 90s scheduler. Kept for configuration compatibility.
        public int MaxJobsPerTick { get; set; } = 0;
    }
}
