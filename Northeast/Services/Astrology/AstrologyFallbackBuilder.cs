using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace Northeast.Services.Astrology
{
    internal static class AstrologyFallbackBuilder
    {
        private static readonly string[] EnergyWords =
        {
            "Magnetic momentum",
            "Steady resonance",
            "Curious cadence",
            "Heart-led tide",
            "Solar flourish",
            "Mindful craftsmanship",
            "Balanced breeze",
            "Alchemical depth",
            "Vision quest",
            "Mountain stride",
            "Future-forward spark",
            "Dreamstream glow"
        };

        private static readonly string[] Moods =
        {
            "Trailblazing",
            "Comfort-craving",
            "Story weaving",
            "Sentimental",
            "Spotlight-ready",
            "Solution seeking",
            "Graceful",
            "Devoted",
            "Expansive",
            "Strategic",
            "Inventive",
            "Ethereal"
        };

        private static readonly string[] Colors =
        {
            "Crimson ember",
            "Verdant moss",
            "Skyline silver",
            "Moonlit pearl",
            "Golden flare",
            "Sage parchment",
            "Rose quartz",
            "Noir garnet",
            "Cobalt horizon",
            "Granite slate",
            "Electric aqua",
            "Seafoam opal"
        };

        private static string FormatDate(DateOnly date)
        {
            var dt = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            return dt.ToString("dddd, MMMM d, yyyy", CultureInfo.InvariantCulture);
        }

        private static (string summary, string weather, string lunar, string highlight) BuildSummary(DateOnly date)
        {
            var prettyDate = FormatDate(date);
            return (
                $"Celestial currents for {prettyDate} emphasise intentional presence. Temper the pace, invite reflection, and let conversations with the cosmos refine your plans.",
                "Planetary harmonics layer fire and water signatures, asking us to blend conviction with compassion in our everyday exchanges.",
                "The Moon sketches a gentle trine with Saturn, rewarding steady rituals and systems that honour both body and intuition.",
                "Small acts of care ripple far today—attend to your relationships with the same reverence you give your ambitions."
            );
        }

        private static List<int> LuckyNumbersFor(int index, int seed)
        {
            var numbers = new HashSet<int>();
            var value = seed + index * 11;
            while (numbers.Count < 5)
            {
                value = (value * 17 + 13) % 89;
                numbers.Add((value % 53) + 1);
            }

            return numbers.OrderBy(n => n).ToList();
        }

        private static string GeneralOutlook(string signName, IReadOnlyList<string> keywords)
        {
            var flavour = keywords.Count > 0 ? keywords[0] : "innate";
            return $"{signName}, your {flavour} instincts tune into the collective pulse today. Notice where a single bold move can align your personal rhythm with the wider world.";
        }

        private static string LoveOutlook(string element, string rulingPlanet)
        {
            return $"Lead with your {element.ToLowerInvariant()} heart. Conversations under {rulingPlanet} guidance open a window for tenderness—share a vulnerability to strengthen trust.";
        }

        private static string CareerOutlook(string modality, IReadOnlyList<string> keywords)
        {
            var focus = keywords.Count > 1 ? keywords[1] : "dedicated";
            return $"{modality} momentum supports professional pivots. Translate your {focus} thinking into a tangible milestone and celebrate incremental progress.";
        }

        private static string WellnessOutlook(string element, IReadOnlyList<string> keywords)
        {
            var cue = keywords.Count > 2 ? keywords[2] : "grounded";
            return $"Anchor the day with a {element.ToLowerInvariant()} ritual—a mindful walk, nourishing meal, or breathing practice keeps your {cue} energy replenished.";
        }

        private static string PeopleRelations(string signName)
        {
            return $"A trusted ally seeks your perspective. Co-create plans and let mutual inspiration remind you why collaboration with {signName} at the helm sparks magic.";
        }

        private static string PetRelations(string element)
        {
            return $"Animal companions mirror your mood; offer play or quiet cuddles according to the {element.ToLowerInvariant()} tone you’re setting.";
        }

        private static string PlanetRelations(string rulingPlanet)
        {
            return $"{rulingPlanet} whispers about timing—listen for intuitive nudges before saying yes to new commitments.";
        }

        private static string StarRelations(string modality)
        {
            return $"{modality} stars outline a constellation of possibility. Chart micro goals and let constellations of past wins guide today’s choices.";
        }

        private static string StoneRelations(string element)
        {
            return element switch
            {
                "Fire" => "Carnelian warms your confidence; hold it during affirmations for a potent solar spark.",
                "Earth" => "Green aventurine grounds optimism—keep a stone in your pocket to steady practical steps.",
                "Air" => "Blue lace agate soothes busy thoughts, clarifying conversations and creative brainstorming.",
                _ => "Moonstone attunes your tides—place it near water to amplify intuition and gentle resilience."
            };
        }

        private static string RitualGuidance(string element)
        {
            return $"Begin with a {element.ToLowerInvariant()} ritual—light a candle, tend a plant, open the window, or brew a tea that honours today’s element.";
        }

        private static string ReflectionGuidance(string modality, string signName)
        {
            return $"{modality} wisdom invites journaling. Ask yourself where {signName} can release an old pattern and invite fresher flow.";
        }

        private static string AdventureGuidance(IReadOnlyList<string> keywords)
        {
            var idea = keywords.Count > 2 ? keywords[2] : keywords.FirstOrDefault() ?? "spirited";
            return $"Schedule a micro-adventure that highlights your {idea} spirit—an unfamiliar route, a new recipe, or a podcast swap with a friend.";
        }

        public static DailyHoroscopeModel Build(DateOnly date)
        {
            var (summary, weather, lunar, highlight) = BuildSummary(date);
            var now = DateTime.UtcNow;

            var signs = ZodiacCatalogue.All
                .Select((sign, index) => new SignHoroscopeModel
                {
                    Id = sign.Id,
                    Name = sign.Name,
                    DateRange = ZodiacCatalogue.FormatDateRange(sign),
                    Element = sign.Element,
                    Modality = sign.Modality,
                    RulingPlanet = sign.RulingPlanet,
                    Icon = sign.Icon,
                    Headline = $"{sign.Name} Focus",
                    Summary = GeneralOutlook(sign.Name, sign.Keywords),
                    Energy = EnergyWords[index % EnergyWords.Length],
                    Outlook = new HoroscopeOutlookModel
                    {
                        General = GeneralOutlook(sign.Name, sign.Keywords),
                        Love = LoveOutlook(sign.Element, sign.RulingPlanet),
                        Career = CareerOutlook(sign.Modality, sign.Keywords),
                        Wellness = WellnessOutlook(sign.Element, sign.Keywords)
                    },
                    Relations = new HoroscopeRelationsModel
                    {
                        People = PeopleRelations(sign.Name),
                        Pets = PetRelations(sign.Element),
                        Planets = PlanetRelations(sign.RulingPlanet),
                        Stars = StarRelations(sign.Modality),
                        Stones = StoneRelations(sign.Element)
                    },
                    Guidance = new HoroscopeGuidanceModel
                    {
                        Ritual = RitualGuidance(sign.Element),
                        Reflection = ReflectionGuidance(sign.Modality, sign.Name),
                        Adventure = AdventureGuidance(sign.Keywords)
                    },
                    Mood = Moods[index % Moods.Length],
                    Color = Colors[index % Colors.Length],
                    Mantra = $"{sign.Name} breathes in confidence and exhales possibility.",
                    LuckyNumbers = LuckyNumbersFor(index, date.Day)
                })
                .ToList();

            return new DailyHoroscopeModel
            {
                ForDate = date,
                GeneratedAtUtc = now,
                Summary = summary,
                CosmicWeather = weather,
                LunarPhase = lunar,
                Highlight = highlight,
                Signs = signs
            };
        }
    }
}
