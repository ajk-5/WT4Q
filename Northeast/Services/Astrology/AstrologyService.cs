using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;

namespace Northeast.Services.Astrology
{
    public class AstrologyService
    {
        private readonly AppDbContext _dbContext;
        private readonly GeminiAstrologyClient _gemini;
        private readonly ILogger<AstrologyService> _logger;

        public AstrologyService(
            AppDbContext dbContext,
            GeminiAstrologyClient gemini,
            ILogger<AstrologyService> logger)
        {
            _dbContext = dbContext;
            _gemini = gemini;
            _logger = logger;
        }

        private static DailyHoroscopeModel MapFromEntity(AstrologyHoroscope entity)
        {
            var model = new DailyHoroscopeModel
            {
                ForDate = entity.ForDate,
                GeneratedAtUtc = entity.GeneratedAtUtc,
                Summary = entity.Summary,
                CosmicWeather = entity.CosmicWeather,
                LunarPhase = entity.LunarPhase,
                Highlight = entity.Highlight,
                Signs = new List<SignHoroscopeModel>()
            };

            foreach (var meta in ZodiacCatalogue.All)
            {
                var signEntity = entity.Signs.FirstOrDefault(s => s.SignId == meta.Id);
                if (signEntity == null)
                {
                    continue;
                }

                model.Signs.Add(new SignHoroscopeModel
                {
                    Id = meta.Id,
                    Name = meta.Name,
                    DateRange = ZodiacCatalogue.FormatDateRange(meta),
                    Element = meta.Element,
                    Modality = meta.Modality,
                    RulingPlanet = meta.RulingPlanet,
                    Icon = meta.Icon,
                    Headline = signEntity.Headline,
                    Summary = signEntity.Summary,
                    Energy = signEntity.Energy,
                    Outlook = new HoroscopeOutlookModel
                    {
                        General = signEntity.OutlookGeneral,
                        Love = signEntity.OutlookLove,
                        Career = signEntity.OutlookCareer,
                        Wellness = signEntity.OutlookWellness
                    },
                    Relations = new HoroscopeRelationsModel
                    {
                        People = signEntity.RelationsPeople,
                        Pets = signEntity.RelationsPets,
                        Planets = signEntity.RelationsPlanets,
                        Stars = signEntity.RelationsStars,
                        Stones = signEntity.RelationsStones
                    },
                    Guidance = new HoroscopeGuidanceModel
                    {
                        Ritual = signEntity.GuidanceRitual,
                        Reflection = signEntity.GuidanceReflection,
                        Adventure = signEntity.GuidanceAdventure
                    },
                    Mood = signEntity.Mood,
                    Color = signEntity.Color,
                    Mantra = signEntity.Mantra,
                    LuckyNumbers = signEntity.LuckyNumbers?.ToList() ?? new List<int>()
                });
            }

            return model;
        }

        private static AstrologyHoroscope MapToEntity(DailyHoroscopeModel model)
        {
            var entity = new AstrologyHoroscope
            {
                ForDate = model.ForDate,
                GeneratedAtUtc = model.GeneratedAtUtc,
                Summary = model.Summary,
                CosmicWeather = model.CosmicWeather,
                LunarPhase = model.LunarPhase,
                Highlight = model.Highlight,
                Signs = new List<AstrologySignForecast>()
            };

            foreach (var sign in model.Signs)
            {
                entity.Signs.Add(new AstrologySignForecast
                {
                    SignId = sign.Id,
                    Headline = sign.Headline,
                    Summary = sign.Summary,
                    Energy = sign.Energy,
                    OutlookGeneral = sign.Outlook.General,
                    OutlookLove = sign.Outlook.Love,
                    OutlookCareer = sign.Outlook.Career,
                    OutlookWellness = sign.Outlook.Wellness,
                    RelationsPeople = sign.Relations.People,
                    RelationsPets = sign.Relations.Pets,
                    RelationsPlanets = sign.Relations.Planets,
                    RelationsStars = sign.Relations.Stars,
                    RelationsStones = sign.Relations.Stones,
                    GuidanceRitual = sign.Guidance.Ritual,
                    GuidanceReflection = sign.Guidance.Reflection,
                    GuidanceAdventure = sign.Guidance.Adventure,
                    Mood = sign.Mood,
                    Color = sign.Color,
                    Mantra = sign.Mantra,
                    LuckyNumbers = sign.LuckyNumbers.ToArray()
                });
            }

            return entity;
        }

        private static List<int> SanitizeLuckyNumbers(List<int>? numbers, List<int> fallback)
        {
            if (numbers == null || numbers.Count == 0)
            {
                return fallback;
            }

            var cleaned = numbers
                .Where(n => n > 0)
                .Distinct()
                .Take(6)
                .ToList();

            return cleaned.Count > 0 ? cleaned : fallback;
        }

        private static DailyHoroscopeModel Merge(DailyHoroscopeModel fallback, GeminiAstrologyClient.GeminiHoroscopePayload? gemini)
        {
            if (gemini == null)
            {
                return fallback;
            }

            var responseMap = gemini.Signs
                .GroupBy(sign => sign.Id, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);

            var signs = new List<SignHoroscopeModel>();

            foreach (var fallbackSign in fallback.Signs)
            {
                responseMap.TryGetValue(fallbackSign.Id, out var dynamicSign);

                var merged = new SignHoroscopeModel
                {
                    Id = fallbackSign.Id,
                    Name = fallbackSign.Name,
                    DateRange = fallbackSign.DateRange,
                    Element = fallbackSign.Element,
                    Modality = fallbackSign.Modality,
                    RulingPlanet = fallbackSign.RulingPlanet,
                    Icon = fallbackSign.Icon,
                    Headline = !string.IsNullOrWhiteSpace(dynamicSign?.Headline) ? dynamicSign!.Headline.Trim() : fallbackSign.Headline,
                    Summary = !string.IsNullOrWhiteSpace(dynamicSign?.Summary) ? dynamicSign!.Summary.Trim() : fallbackSign.Summary,
                    Energy = !string.IsNullOrWhiteSpace(dynamicSign?.Energy) ? dynamicSign!.Energy.Trim() : fallbackSign.Energy,
                    Outlook = new HoroscopeOutlookModel
                    {
                        General = !string.IsNullOrWhiteSpace(dynamicSign?.Outlook.General)
                            ? dynamicSign!.Outlook.General.Trim()
                            : fallbackSign.Outlook.General,
                        Love = !string.IsNullOrWhiteSpace(dynamicSign?.Outlook.Love)
                            ? dynamicSign!.Outlook.Love.Trim()
                            : fallbackSign.Outlook.Love,
                        Career = !string.IsNullOrWhiteSpace(dynamicSign?.Outlook.Career)
                            ? dynamicSign!.Outlook.Career.Trim()
                            : fallbackSign.Outlook.Career,
                        Wellness = !string.IsNullOrWhiteSpace(dynamicSign?.Outlook.Wellness)
                            ? dynamicSign!.Outlook.Wellness.Trim()
                            : fallbackSign.Outlook.Wellness
                    },
                    Relations = new HoroscopeRelationsModel
                    {
                        People = !string.IsNullOrWhiteSpace(dynamicSign?.Relations.People)
                            ? dynamicSign!.Relations.People.Trim()
                            : fallbackSign.Relations.People,
                        Pets = !string.IsNullOrWhiteSpace(dynamicSign?.Relations.Pets)
                            ? dynamicSign!.Relations.Pets.Trim()
                            : fallbackSign.Relations.Pets,
                        Planets = !string.IsNullOrWhiteSpace(dynamicSign?.Relations.Planets)
                            ? dynamicSign!.Relations.Planets.Trim()
                            : fallbackSign.Relations.Planets,
                        Stars = !string.IsNullOrWhiteSpace(dynamicSign?.Relations.Stars)
                            ? dynamicSign!.Relations.Stars.Trim()
                            : fallbackSign.Relations.Stars,
                        Stones = !string.IsNullOrWhiteSpace(dynamicSign?.Relations.Stones)
                            ? dynamicSign!.Relations.Stones.Trim()
                            : fallbackSign.Relations.Stones
                    },
                    Guidance = new HoroscopeGuidanceModel
                    {
                        Ritual = !string.IsNullOrWhiteSpace(dynamicSign?.Guidance.Ritual)
                            ? dynamicSign!.Guidance.Ritual.Trim()
                            : fallbackSign.Guidance.Ritual,
                        Reflection = !string.IsNullOrWhiteSpace(dynamicSign?.Guidance.Reflection)
                            ? dynamicSign!.Guidance.Reflection.Trim()
                            : fallbackSign.Guidance.Reflection,
                        Adventure = !string.IsNullOrWhiteSpace(dynamicSign?.Guidance.Adventure)
                            ? dynamicSign!.Guidance.Adventure.Trim()
                            : fallbackSign.Guidance.Adventure
                    },
                    Mood = !string.IsNullOrWhiteSpace(dynamicSign?.Mood) ? dynamicSign!.Mood.Trim() : fallbackSign.Mood,
                    Color = !string.IsNullOrWhiteSpace(dynamicSign?.Color) ? dynamicSign!.Color.Trim() : fallbackSign.Color,
                    Mantra = !string.IsNullOrWhiteSpace(dynamicSign?.Mantra) ? dynamicSign!.Mantra.Trim() : fallbackSign.Mantra,
                    LuckyNumbers = SanitizeLuckyNumbers(dynamicSign?.LuckyNumbers, fallbackSign.LuckyNumbers)
                };

                signs.Add(merged);
            }

            var generatedFor = fallback.ForDate;
            if (DateOnly.TryParse(gemini.GeneratedFor, out var parsedDate))
            {
                generatedFor = parsedDate;
            }

            return new DailyHoroscopeModel
            {
                ForDate = generatedFor,
                GeneratedAtUtc = DateTime.UtcNow,
                Summary = string.IsNullOrWhiteSpace(gemini.Summary) ? fallback.Summary : gemini.Summary.Trim(),
                CosmicWeather = string.IsNullOrWhiteSpace(gemini.CosmicWeather) ? fallback.CosmicWeather : gemini.CosmicWeather.Trim(),
                LunarPhase = string.IsNullOrWhiteSpace(gemini.LunarPhase) ? fallback.LunarPhase : gemini.LunarPhase.Trim(),
                Highlight = string.IsNullOrWhiteSpace(gemini.Highlight) ? fallback.Highlight : gemini.Highlight.Trim(),
                Signs = signs
            };
        }

        public async Task<DailyHoroscopeModel> GetDailyHoroscopeAsync(DateOnly date, CancellationToken cancellationToken)
        {
            var existing = await _dbContext.AstrologyHoroscopes
                .Include(h => h.Signs)
                .FirstOrDefaultAsync(h => h.ForDate == date, cancellationToken);

            if (existing != null && existing.Signs.Count == ZodiacCatalogue.All.Count)
            {
                return MapFromEntity(existing);
            }

            return await GenerateAndStoreAsync(date, cancellationToken);
        }

        private async Task<DailyHoroscopeModel> GenerateAndStoreAsync(DateOnly date, CancellationToken cancellationToken)
        {
            var fallback = AstrologyFallbackBuilder.Build(date);
            GeminiAstrologyClient.GeminiHoroscopePayload? gemini = null;

            try
            {
                gemini = await _gemini.GenerateAsync(date, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini astrology generation failed. Using fallback horoscope for {Date}.", date);
            }

            var merged = Merge(fallback, gemini);

            // Remove any existing entry for the date to avoid duplicates
            var previous = await _dbContext.AstrologyHoroscopes
                .Include(h => h.Signs)
                .Where(h => h.ForDate == merged.ForDate)
                .ToListAsync(cancellationToken);

            if (previous.Count > 0)
            {
                _dbContext.AstrologyHoroscopes.RemoveRange(previous);
            }

            var entity = MapToEntity(merged);
            _dbContext.AstrologyHoroscopes.Add(entity);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return MapFromEntity(entity);
        }

        public DailyHoroscopeDto ToDto(DailyHoroscopeModel model)
        {
            return new DailyHoroscopeDto
            {
                GeneratedFor = model.ForDate.ToString("yyyy-MM-dd"),
                GeneratedAt = model.GeneratedAtUtc,
                Summary = model.Summary,
                CosmicWeather = model.CosmicWeather,
                LunarPhase = model.LunarPhase,
                Highlight = model.Highlight,
                Signs = model.Signs.Select(sign => new AstrologySignDto
                {
                    Id = sign.Id,
                    Name = sign.Name,
                    DateRange = sign.DateRange,
                    Element = sign.Element,
                    Modality = sign.Modality,
                    RulingPlanet = sign.RulingPlanet,
                    Icon = sign.Icon,
                    Headline = sign.Headline,
                    Summary = sign.Summary,
                    Energy = sign.Energy,
                    Outlook = new HoroscopeOutlookDto
                    {
                        General = sign.Outlook.General,
                        Love = sign.Outlook.Love,
                        Career = sign.Outlook.Career,
                        Wellness = sign.Outlook.Wellness
                    },
                    Relations = new HoroscopeRelationsDto
                    {
                        People = sign.Relations.People,
                        Pets = sign.Relations.Pets,
                        Planets = sign.Relations.Planets,
                        Stars = sign.Relations.Stars,
                        Stones = sign.Relations.Stones
                    },
                    Guidance = new HoroscopeGuidanceDto
                    {
                        Ritual = sign.Guidance.Ritual,
                        Reflection = sign.Guidance.Reflection,
                        Adventure = sign.Guidance.Adventure
                    },
                    Mood = sign.Mood,
                    Color = sign.Color,
                    Mantra = sign.Mantra,
                    LuckyNumbers = sign.LuckyNumbers
                }).ToList()
            };
        }

        public async Task<AstrologySubscription?> GetSubscriptionAsync(Guid userId, CancellationToken cancellationToken)
        {
            return await _dbContext.AstrologySubscriptions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);
        }

        public async Task<AstrologySubscription> UpsertSubscriptionAsync(
            Guid userId,
            string email,
            string? userName,
            string signId,
            string? countryCode,
            string timeZone,
            int sendHour,
            CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var normalizedSign = signId.ToLowerInvariant();
            var normalizedCountry = string.IsNullOrWhiteSpace(countryCode) ? null : countryCode.ToUpperInvariant();
            var normalizedTimeZone = string.IsNullOrWhiteSpace(timeZone) ? "UTC" : timeZone.Trim();
            var hour = Math.Clamp(sendHour, 0, 23);

            var existing = await _dbContext.AstrologySubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

            if (existing != null)
            {
                existing.SignId = normalizedSign;
                existing.CountryCode = normalizedCountry;
                existing.TimeZone = normalizedTimeZone;
                existing.SendHour = hour;
                existing.Email = email;
                existing.UserName = userName;
                existing.Active = true;
                existing.UpdatedAtUtc = now;

                await _dbContext.SaveChangesAsync(cancellationToken);
                return existing;
            }

            var subscription = new AstrologySubscription
            {
                UserId = userId,
                Email = email,
                UserName = userName,
                SignId = normalizedSign,
                CountryCode = normalizedCountry,
                TimeZone = normalizedTimeZone,
                SendHour = hour,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                Active = true
            };

            _dbContext.AstrologySubscriptions.Add(subscription);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return subscription;
        }

        public async Task RemoveSubscriptionAsync(Guid userId, CancellationToken cancellationToken)
        {
            var existing = await _dbContext.AstrologySubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

            if (existing != null)
            {
                _dbContext.AstrologySubscriptions.Remove(existing);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task<List<AstrologySubscription>> GetActiveSubscriptionsAsync(CancellationToken cancellationToken)
        {
            return await _dbContext.AstrologySubscriptions
                .Where(s => s.Active)
                .ToListAsync(cancellationToken);
        }

        public async Task<List<AstrologySubscription>> GetDueSubscriptionsAsync(
            DateTime utcNow,
            DateOnly forDate,
            CancellationToken cancellationToken)
        {
            var subscriptions = await GetActiveSubscriptionsAsync(cancellationToken);
            var due = new List<AstrologySubscription>();

            foreach (var subscription in subscriptions)
            {
                TimeZoneInfo? timeZone = null;
                try
                {
                    timeZone = TimeZoneInfo.FindSystemTimeZoneById(subscription.TimeZone);
                }
                catch (TimeZoneNotFoundException)
                {
                    _logger.LogWarning("Astrology subscription {Email} has invalid timezone {TimeZone}", subscription.Email, subscription.TimeZone);
                }
                catch (InvalidTimeZoneException)
                {
                    _logger.LogWarning("Astrology subscription {Email} has invalid timezone {TimeZone}", subscription.Email, subscription.TimeZone);
                }

                if (timeZone == null)
                {
                    continue;
                }

                var local = TimeZoneInfo.ConvertTimeFromUtc(utcNow, timeZone);
                if (local.Hour < subscription.SendHour)
                {
                    continue;
                }

                if (subscription.LastSentForDate.HasValue && subscription.LastSentForDate.Value >= forDate)
                {
                    continue;
                }

                due.Add(subscription);
            }

            return due;
        }

        public async Task MarkDeliveredAsync(AstrologySubscription subscription, DateOnly forDate, CancellationToken cancellationToken)
        {
            subscription.LastSentForDate = forDate;
            subscription.UpdatedAtUtc = DateTime.UtcNow;
            _dbContext.AstrologySubscriptions.Update(subscription);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
