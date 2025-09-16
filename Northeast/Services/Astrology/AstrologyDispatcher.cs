using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Microsoft.Extensions.Logging;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Services;

namespace Northeast.Services.Astrology
{
    public class AstrologyDispatcher
    {
        private readonly AstrologyService _astrologyService;
        private readonly SendEmail _mailer;
        private readonly ILogger<AstrologyDispatcher> _logger;
        private readonly TimeProvider _timeProvider;

        public AstrologyDispatcher(
            AstrologyService astrologyService,
            SendEmail mailer,
            ILogger<AstrologyDispatcher> logger,
            TimeProvider timeProvider)
        {
            _astrologyService = astrologyService;
            _mailer = mailer;
            _logger = logger;
            _timeProvider = timeProvider;
        }

        private static string FormatLuckyNumbers(IEnumerable<int> numbers) =>
            string.Join(", ", numbers);

        private static string BuildEmailBody(
            DailyHoroscopeModel daily,
            SignHoroscopeModel sign,
            AstrologySubscription subscription)
        {
            var dateText = daily.ForDate.ToString("MMMM dd, yyyy", CultureInfo.InvariantCulture);
            var greeting = string.IsNullOrWhiteSpace(subscription.UserName)
                ? "Hello"
                : $"Hello {subscription.UserName}";

            var builder = new StringBuilder();
            builder.Append("<div style=\"font-family:'Segoe UI',Arial,sans-serif;color:#1f2933;line-height:1.6;padding:16px;\">");
            builder.AppendFormat("<p style=\"margin-top:0;\">{0},</p>", greeting);
            builder.AppendFormat(
                "<p style=\"margin:0 0 16px 0;\">Your <strong>{0}</strong> horoscope for <strong>{1}</strong> is ready. We generated today’s guidance at 00:00 GMT using Gemini and layered it with The Nineties Times fallback wisdom.</p>",
                sign.Name,
                dateText);

            builder.Append("<div style=\"margin:24px 0;\">");
            builder.Append("<h2 style=\"font-size:18px;color:#111827;margin-bottom:8px;\">Cosmic Weather</h2>");
            builder.AppendFormat("<p style=\"margin:0 0 12px 0;\">{0}</p>", daily.CosmicWeather);
            builder.Append("<h3 style=\"font-size:16px;color:#111827;margin:16px 0 8px 0;\">Lunar Pulse</h3>");
            builder.AppendFormat("<p style=\"margin:0 0 12px 0;\">{0}</p>", daily.LunarPhase);
            builder.Append("<h3 style=\"font-size:16px;color:#111827;margin:16px 0 8px 0;\">Highlight</h3>");
            builder.AppendFormat("<p style=\"margin:0;\">{0}</p>", daily.Highlight);
            builder.Append("</div>");

            builder.Append("<div style=\"border-top:1px solid #e5e7eb;margin:24px 0;padding-top:24px;\">");
            builder.AppendFormat(
                "<h2 style=\"font-size:20px;color:#111827;margin:0 0 12px 0;\">{0} • {1}</h2>",
                sign.Name,
                sign.DateRange);
            builder.AppendFormat(
                "<p style=\"margin:0 0 16px 0;\"><em>{0}</em></p>",
                sign.Mantra);
            builder.AppendFormat(
                "<p style=\"margin:0 0 16px 0;\">{0}</p>",
                sign.Summary);

            builder.Append("<table style=\"width:100%;border-collapse:collapse;margin:16px 0;\"><tbody>");
            builder.Append("<tr>");
            builder.AppendFormat(
                "<td style=\"padding:8px;background:#f3f4f6;\"><strong>Mood</strong><br />{0}</td>",
                sign.Mood);
            builder.AppendFormat(
                "<td style=\"padding:8px;background:#f9fafb;\"><strong>Aura Color</strong><br />{0}</td>",
                sign.Color);
            builder.AppendFormat(
                "<td style=\"padding:8px;background:#f3f4f6;\"><strong>Lucky Numbers</strong><br />{0}</td>",
                FormatLuckyNumbers(sign.LuckyNumbers));
            builder.Append("</tr></tbody></table>");

            builder.Append("<div style=\"margin:16px 0;\">");
            builder.Append("<h3 style=\"font-size:16px;color:#111827;margin:16px 0 8px 0;\">Outlook</h3>");
            builder.AppendFormat("<p style=\"margin:0 0 12px 0;\"><strong>General:</strong> {0}</p>", sign.Outlook.General);
            builder.AppendFormat("<p style=\"margin:0 0 12px 0;\"><strong>Love:</strong> {0}</p>", sign.Outlook.Love);
            builder.AppendFormat("<p style=\"margin:0 0 12px 0;\"><strong>Career:</strong> {0}</p>", sign.Outlook.Career);
            builder.AppendFormat("<p style=\"margin:0 0 12px 0;\"><strong>Wellness:</strong> {0}</p>", sign.Outlook.Wellness);

            builder.Append("<h3 style=\"font-size:16px;color:#111827;margin:16px 0 8px 0;\">Relational Constellations</h3>");
            builder.Append("<ul style=\"margin:0 0 16px 16px;padding:0;\">");
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>People:</strong> {0}</li>", sign.Relations.People);
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Pets:</strong> {0}</li>", sign.Relations.Pets);
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Stars:</strong> {0}</li>", sign.Relations.Stars);
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Planets:</strong> {0}</li>", sign.Relations.Planets);
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Stones:</strong> {0}</li>", sign.Relations.Stones);
            builder.Append("</ul>");

            builder.Append("<h3 style=\"font-size:16px;color:#111827;margin:16px 0 8px 0;\">Guided Rituals</h3>");
            builder.Append("<ul style=\"margin:0 0 16px 16px;padding:0;\">");
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Morning ritual:</strong> {0}</li>", sign.Guidance.Ritual);
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Reflection:</strong> {0}</li>", sign.Guidance.Reflection);
            builder.AppendFormat("<li style=\"margin-bottom:8px;\"><strong>Adventure:</strong> {0}</li>", sign.Guidance.Adventure);
            builder.Append("</ul>");
            builder.Append("</div>");
            builder.Append("</div>");

            builder.Append("<p style=\"font-size:13px;color:#6b7280;margin-top:24px;\">You are receiving this email because you opted into daily horoscopes on 90stimes.com. Update your preferences or unsubscribe from your account settings at any time.</p>");
            builder.Append("</div>");

            return builder.ToString();
        }

        public async Task<AstrologyDispatchReportDto> DispatchAsync(CancellationToken cancellationToken)
        {
            var report = new AstrologyDispatchReportDto();
            var utcNow = _timeProvider.GetUtcNow().UtcDateTime;
            var forDate = DateOnly.FromDateTime(utcNow);

            var horoscope = await _astrologyService.GetDailyHoroscopeAsync(forDate, cancellationToken);
            var due = await _astrologyService.GetDueSubscriptionsAsync(utcNow, horoscope.ForDate, cancellationToken);

            report.Pending = due.Count;

            foreach (var subscription in due)
            {
                var detail = new AstrologyDispatchDetailDto
                {
                    Email = subscription.Email
                };

                try
                {
                    var sign = horoscope.Signs.FirstOrDefault(s =>
                        string.Equals(s.Id, subscription.SignId, StringComparison.OrdinalIgnoreCase));

                    if (sign == null)
                    {
                        detail.Status = "skipped";
                        detail.Reason = "Sign not available";
                        report.Skipped++;
                        report.Detail.Add(detail);
                        continue;
                    }

                    var subject = $"{sign.Name} Horoscope • {horoscope.ForDate:MMMM dd}";
                    var body = BuildEmailBody(horoscope, sign, subscription);
                    await _mailer.SendPersonalizedEmail(subscription.Email, subject, body);
                    await _astrologyService.MarkDeliveredAsync(subscription, horoscope.ForDate, cancellationToken);

                    detail.Status = "sent";
                    report.Sent++;
                }
                catch (Exception ex)
                {
                    detail.Status = "skipped";
                    detail.Reason = ex.Message;
                    report.Skipped++;
                    _logger.LogError(ex, "Failed to send horoscope email to {Email}", subscription.Email);
                }

                report.Attempted++;
                report.Detail.Add(detail);
            }

            return report;
        }
    }
}
