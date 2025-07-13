
using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Northeast.Models;

namespace Northast.Services
{
    public class SendEmail
    {
        private readonly string smtpEmail;
        private readonly string smtpPassword;
        private readonly string smtpHost;
        private readonly int smtpPort;

        public SendEmail(IConfiguration configuration)
        {
            var smtpConfig = configuration.GetSection("SmtpSettings");
            smtpEmail = smtpConfig["Email"];
            smtpPassword = smtpConfig["Password"];
            smtpHost = smtpConfig["Host"] ?? "smtp.gmail.com"; // Default Gmail SMTP
            smtpPort = int.TryParse(smtpConfig["Port"], out int port) ? port : 587;

            if (string.IsNullOrEmpty(smtpEmail) || string.IsNullOrEmpty(smtpPassword))
            {
                throw new InvalidOperationException("❌ SMTP credentials are missing. Set them in environment variables or appsettings.json.");
            }
        }

        // ✅ Send OTP Email (Async)
        public async Task SendPasswordResetAsync(string email, OTP otp)
        {
            using (var smtpClient = new SmtpClient(smtpHost, smtpPort))
            {
                smtpClient.Credentials = new NetworkCredential(smtpEmail, smtpPassword);
                smtpClient.EnableSsl = true;

                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(smtpEmail);
                    mailMessage.To.Add(email);
                    mailMessage.Subject = "🔑 Password Reset OTP";
                    mailMessage.Body = $"<strong>Dear User,</strong><br>Your password reset OTP is <strong>{otp.SixDigit}</strong>. It expires in 15 minutes.";
                    mailMessage.IsBodyHtml = true;

                    try
                    {
                        await smtpClient.SendMailAsync(mailMessage);
                        Console.WriteLine($"✅ OTP email sent to {email}.");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"❌ Failed to send OTP email: {ex.Message}");
                    }
                }
            }
        }
        public async Task SendPersonalizedEmail(string email, string Subject, string body)
        {
            using (var smtpClient = new SmtpClient(smtpHost, smtpPort))
            {
                smtpClient.Credentials = new NetworkCredential(smtpEmail, smtpPassword);
                smtpClient.EnableSsl = true;

                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(smtpEmail);
                    mailMessage.To.Add(email);
                    mailMessage.Subject = Subject;
                    mailMessage.Body = body; //$"<strong>Dear User,</strong><br>Your password reset OTP is <strong>{otp.SixDigit}</strong>. It expires in 15 minutes.";
                    mailMessage.IsBodyHtml = true;

                    try
                    {
                        await smtpClient.SendMailAsync(mailMessage);
                        Console.WriteLine($"✅ OTP email sent to {email}.");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"❌ Failed to send OTP email: {ex.Message}");
                    }
                }
            }
        }



    }
}