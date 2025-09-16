using System.Globalization;
using System.Linq;

namespace Northeast.Services.Astrology
{
    internal record ZodiacSignMeta(
        string Id,
        string Name,
        int StartMonth,
        int StartDay,
        int EndMonth,
        int EndDay,
        string Element,
        string Modality,
        string RulingPlanet,
        string Icon,
        IReadOnlyList<string> Keywords);

    internal static class ZodiacCatalogue
    {
        public static readonly IReadOnlyList<ZodiacSignMeta> All = new List<ZodiacSignMeta>
        {
            new(
                "aries",
                "Aries",
                3,
                21,
                4,
                19,
                "Fire",
                "Cardinal",
                "Mars",
                "/images/astrology/aries.svg",
                new[] { "trailblazing", "spontaneous", "courageous" }
            ),
            new(
                "taurus",
                "Taurus",
                4,
                20,
                5,
                20,
                "Earth",
                "Fixed",
                "Venus",
                "/images/astrology/taurus.svg",
                new[] { "grounded", "sensual", "steadfast" }
            ),
            new(
                "gemini",
                "Gemini",
                5,
                21,
                6,
                20,
                "Air",
                "Mutable",
                "Mercury",
                "/images/astrology/gemini.svg",
                new[] { "curious", "expressive", "versatile" }
            ),
            new(
                "cancer",
                "Cancer",
                6,
                21,
                7,
                22,
                "Water",
                "Cardinal",
                "Moon",
                "/images/astrology/cancer.svg",
                new[] { "nurturing", "intuitive", "protective" }
            ),
            new(
                "leo",
                "Leo",
                7,
                23,
                8,
                22,
                "Fire",
                "Fixed",
                "Sun",
                "/images/astrology/leo.svg",
                new[] { "radiant", "dramatic", "charismatic" }
            ),
            new(
                "virgo",
                "Virgo",
                8,
                23,
                9,
                22,
                "Earth",
                "Mutable",
                "Mercury",
                "/images/astrology/virgo.svg",
                new[] { "practical", "precise", "service-oriented" }
            ),
            new(
                "libra",
                "Libra",
                9,
                23,
                10,
                22,
                "Air",
                "Cardinal",
                "Venus",
                "/images/astrology/libra.svg",
                new[] { "harmonising", "diplomatic", "refined" }
            ),
            new(
                "scorpio",
                "Scorpio",
                10,
                23,
                11,
                21,
                "Water",
                "Fixed",
                "Pluto",
                "/images/astrology/scorpio.svg",
                new[] { "intense", "transformative", "magnetic" }
            ),
            new(
                "sagittarius",
                "Sagittarius",
                11,
                22,
                12,
                21,
                "Fire",
                "Mutable",
                "Jupiter",
                "/images/astrology/sagittarius.svg",
                new[] { "adventurous", "optimistic", "philosophical" }
            ),
            new(
                "capricorn",
                "Capricorn",
                12,
                22,
                1,
                19,
                "Earth",
                "Cardinal",
                "Saturn",
                "/images/astrology/capricorn.svg",
                new[] { "ambitious", "structured", "resilient" }
            ),
            new(
                "aquarius",
                "Aquarius",
                1,
                20,
                2,
                18,
                "Air",
                "Fixed",
                "Uranus",
                "/images/astrology/aquarius.svg",
                new[] { "visionary", "progressive", "unconventional" }
            ),
            new(
                "pisces",
                "Pisces",
                2,
                19,
                3,
                20,
                "Water",
                "Mutable",
                "Neptune",
                "/images/astrology/pisces.svg",
                new[] { "dreamy", "empathetic", "mystical" }
            )
        };

        public static ZodiacSignMeta? Find(string id) =>
            All.FirstOrDefault(sign => string.Equals(sign.Id, id, StringComparison.OrdinalIgnoreCase));

        public static string FormatDateRange(ZodiacSignMeta sign)
        {
            var start = new DateTime(2000, sign.StartMonth, sign.StartDay);
            var end = new DateTime(
                sign.EndMonth < sign.StartMonth ? 2001 : 2000,
                sign.EndMonth,
                sign.EndDay);

            string Format(DateTime value) => value.ToString("MMM dd", CultureInfo.InvariantCulture);

            return $"{Format(start)} – {Format(end)}";
        }
    }
}
