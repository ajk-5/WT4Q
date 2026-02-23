using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Options;

namespace Northeast.Services
{
    public sealed class NinetiesContentScheduler : BackgroundService
    {
        private readonly ILogger<NinetiesContentScheduler> _log;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly NinetiesContentOptions _options;
        private readonly Random _rng = new();

        private readonly TimeZoneInfo _timeZone;
        private readonly TimeSpan[] _onThisDayTimes;
        private readonly TimeSpan[] _blastFromPastTimes;

        private DateTimeOffset _lastJokesQueuedUtc = DateTimeOffset.MinValue;
        private int _lastBlastIndex = -1;

        // Track per-(series@time) last run date in local time zone.
        private readonly Dictionary<string, DateOnly> _lastDailyRunLocalDate = new(StringComparer.OrdinalIgnoreCase);

        private static readonly TimeSpan[] DefaultOnThisDayTimes = { new(9, 0, 0) };
        private static readonly TimeSpan[] DefaultBlastFromPastTimes = { new(21, 0, 0) };

        private static readonly string[] BlastFromPastIdeas =
        {
            "1990: the neon windbreaker era and loud color-blocking",
            "1991: the mixtape culture—making the perfect side A/side B",
            "1992: the mall hangout ritual and food-court classics",
            "1993: the rise of 16-bit legends and after-school gaming",
            "1994: Saturday morning cartoons and cereal power rankings",
            "1995: the early internet—chat rooms, web rings, and fan pages",
            "1996: school binder aesthetics—stickers, doodles, and gel pens",
            "1997: Tamagotchi mania and the pocket-pet craze",
            "1998: the boy band/pop boom and MTV countdown nights",
            "1999: the Y2K vibe, tech anxiety, and millennium party energy",
            "Blockbuster nights: picking one VHS/DVD that defined your weekend",
            "Arcade glory: chasing high scores on 90s cabinet classics",
            "90s snacks: lunchbox icons and the ultimate after-school lineup",
            "The console wars: SNES vs Genesis vs PlayStation debates",
            "The CD era: saving allowance, liner notes, and album obsessions",
        };

        public NinetiesContentScheduler(
            ILogger<NinetiesContentScheduler> log,
            IServiceScopeFactory scopeFactory,
            IOptions<NinetiesContentOptions> options)
        {
            _log = log;
            _scopeFactory = scopeFactory;
            _options = options.Value;

            _timeZone = ResolveTimeZone(_options.TimeZoneId, _log);
            _onThisDayTimes = ParseTimes(_options.OnThisDayLocalTimes, DefaultOnThisDayTimes, _log, "OnThisDayLocalTimes");
            _blastFromPastTimes = ParseTimes(_options.BlastFromPastLocalTimes, DefaultBlastFromPastTimes, _log, "BlastFromPastLocalTimes");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.Enabled)
            {
                _log.LogInformation("NinetiesContentScheduler disabled via configuration.");
                return;
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            var minutes = Math.Clamp(_options.IntervalMinutes, 1, 1440);
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(minutes));
            _log.LogInformation(
                "NinetiesContentScheduler started (tick {Interval}m, TZ {TimeZoneId}).",
                minutes,
                _timeZone.Id);

            try
            {
                while (await timer.WaitForNextTickAsync(stoppingToken))
                {
                    try
                    {
                        await TickAsync(stoppingToken);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _log.LogError(ex, "Nineties content tick failed.");
                    }
                }
            }
            finally
            {
                _log.LogInformation("NinetiesContentScheduler stopping.");
            }
        }

        private async Task TickAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var queue = scope.ServiceProvider.GetRequiredService<IAiWriteQueue>();
            var authorResolver = scope.ServiceProvider.GetRequiredService<AuthorResolver>();

            var authorId = await authorResolver.GetAuthorIdAsync(ct);
            var nowUtc = DateTimeOffset.UtcNow;
            var localNow = TimeZoneInfo.ConvertTime(nowUtc, _timeZone);

            QueueJokesIfDue(queue, authorId, nowUtc, localNow);
            QueueDailySeriesIfDue(queue, authorId, localNow, AiTemplates.OnThisDay, _onThisDayTimes, BuildOnThisDayTopic);
            QueueDailySeriesIfDue(queue, authorId, localNow, AiTemplates.BlastFromThePast, _blastFromPastTimes, BuildBlastFromPastTopic);
        }

        private void QueueJokesIfDue(
            IAiWriteQueue queue,
            Guid authorId,
            DateTimeOffset nowUtc,
            DateTimeOffset localNow)
        {
            var everyHours = Math.Clamp(_options.JokesIntervalHours, 1, 24);
            if ((nowUtc - _lastJokesQueuedUtc) < TimeSpan.FromHours(everyHours))
                return;

            var req = new AiWriteRequestDto
            {
                Topic = $"Fresh 90s jokes & one-liners (drop: {localNow:MMM d, h tt})",
                Template = AiTemplates.Jokes,
                Category = Category.Info,
                ArticleType = ArticleType.Article,
                UseRecentNews = false
            };

            var job = queue.Enqueue(authorId, req);
            _lastJokesQueuedUtc = nowUtc;
            _log.LogInformation("Queued jokes job {JobId} every {Hours}h.", job.Id, everyHours);
        }

        private void QueueDailySeriesIfDue(
            IAiWriteQueue queue,
            Guid authorId,
            DateTimeOffset localNow,
            string template,
            IReadOnlyList<TimeSpan> localTimes,
            Func<DateTimeOffset, string> topicFactory)
        {
            if (localTimes.Count == 0) return;

            var today = DateOnly.FromDateTime(localNow.DateTime);

            foreach (var scheduled in localTimes)
            {
                if (localNow.TimeOfDay < scheduled)
                    continue;

                var key = $"{template}@{scheduled:hh\\:mm}";
                if (_lastDailyRunLocalDate.TryGetValue(key, out var lastDate) && lastDate == today)
                    continue;

                var req = new AiWriteRequestDto
                {
                    Topic = topicFactory(localNow),
                    Template = template,
                    Category = Category.Info,
                    ArticleType = ArticleType.Article,
                    UseRecentNews = false
                };

                var job = queue.Enqueue(authorId, req);
                _lastDailyRunLocalDate[key] = today;
                _log.LogInformation("Queued daily series job {JobId}: {Template} ({LocalTime})", job.Id, template, scheduled);
            }
        }

        private string BuildOnThisDayTopic(DateTimeOffset localNow)
            => $"On this day in the 90s — {localNow:MMMM d}: a quick timeline of 1990s moments";

        private string BuildBlastFromPastTopic(DateTimeOffset localNow)
        {
            var idea = PickBlastIdea();
            return $"Blast from the past ({localNow:MMMM d}) — {idea}";
        }

        private string PickBlastIdea()
        {
            if (BlastFromPastIdeas.Length == 0)
                return "90s memory lane feature";

            var idx = _rng.Next(BlastFromPastIdeas.Length);
            if (BlastFromPastIdeas.Length > 1 && idx == _lastBlastIndex)
                idx = (idx + 1) % BlastFromPastIdeas.Length;

            _lastBlastIndex = idx;
            return BlastFromPastIdeas[idx];
        }

        private static TimeZoneInfo ResolveTimeZone(string? timeZoneId, ILogger log)
        {
            if (string.IsNullOrWhiteSpace(timeZoneId))
                return TimeZoneInfo.Utc;

            if (TryFindTimeZone(timeZoneId.Trim(), out var tz))
                return tz!;

            // Minimal cross-platform mapping for common US zones (IANA <-> Windows)
            var mapped = timeZoneId.Trim() switch
            {
                "America/New_York" => "Eastern Standard Time",
                "America/Chicago" => "Central Standard Time",
                "America/Denver" => "Mountain Standard Time",
                "America/Los_Angeles" => "Pacific Standard Time",
                "Eastern Standard Time" => "America/New_York",
                "Central Standard Time" => "America/Chicago",
                "Mountain Standard Time" => "America/Denver",
                "Pacific Standard Time" => "America/Los_Angeles",
                _ => null
            };

            if (!string.IsNullOrWhiteSpace(mapped) && TryFindTimeZone(mapped, out tz))
                return tz!;

            log.LogWarning("Unknown TimeZoneId '{TimeZoneId}'. Falling back to UTC.", timeZoneId);
            return TimeZoneInfo.Utc;
        }

        private static bool TryFindTimeZone(string id, out TimeZoneInfo? timeZone)
        {
            try
            {
                timeZone = TimeZoneInfo.FindSystemTimeZoneById(id);
                return true;
            }
            catch
            {
                timeZone = null;
                return false;
            }
        }

        private static TimeSpan[] ParseTimes(
            string[] raw,
            TimeSpan[] fallback,
            ILogger log,
            string label)
        {
            var parsed = new List<TimeSpan>();

            foreach (var entry in raw ?? Array.Empty<string>())
            {
                var maybe = TryParseTimeOfDay(entry);
                if (maybe is null)
                {
                    log.LogWarning("Ignoring invalid {Label} entry: '{Entry}'", label, entry);
                    continue;
                }
                parsed.Add(maybe.Value);
            }

            if (parsed.Count == 0)
                parsed.AddRange(fallback);

            return parsed
                .Distinct()
                .OrderBy(t => t)
                .ToArray();
        }

        private static TimeSpan? TryParseTimeOfDay(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return null;

            var s = raw.Trim();

            if (TimeSpan.TryParseExact(s, new[] { "h\\:mm", "hh\\:mm", "h\\:mm\\:ss", "hh\\:mm\\:ss" }, CultureInfo.InvariantCulture, out var ts))
                return new TimeSpan(ts.Hours, ts.Minutes, 0);

            if (TimeSpan.TryParse(s, CultureInfo.InvariantCulture, out ts))
                return new TimeSpan(ts.Hours, ts.Minutes, 0);

            return null;
        }
    }
}

