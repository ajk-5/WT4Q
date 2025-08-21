using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Northeast.Configuration;
using Northeast.Data;
using Northeast.Models;
using Northeast.Ai;

namespace Northeast.Services
{
    public class HorrorArticleService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly AiArticleGenerator _generator;
        private readonly SemaphoreSlim _gate;
        private readonly AiNewsOptions _options;
        private readonly ILogger<HorrorArticleService> _logger;

        public HorrorArticleService(IServiceScopeFactory scopeFactory, AiArticleGenerator generator,
                                    SemaphoreSlim gate, IOptions<AiNewsOptions> options,
                                    ILogger<HorrorArticleService> logger)
        {
            _scopeFactory = scopeFactory;
            _generator = generator;
            _gate = gate;
            _options = options.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_options.EnableHorror)
            {
                _logger.LogInformation("HorrorArticleService is disabled via configuration.");
                return;
            }

            using PeriodicTimer timer = new PeriodicTimer(_options.HorrorInterval);
            try
            {
                while (await timer.WaitForNextTickAsync(stoppingToken))
                {
                    await _gate.WaitAsync(stoppingToken);
                    try
                    {
                        ArticleDto articleDto = await _generator.GenerateHorrorArticleAsync(stoppingToken);
                        if (articleDto == null)
                        {
                            continue;
                        }

                        using var scope = _scopeFactory.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                        string titleHash;
                        using (var sha256 = System.Security.Cryptography.SHA256.Create())
                        {
                            byte[] titleBytes = System.Text.Encoding.UTF8.GetBytes(articleDto.Title.ToLowerInvariant());
                            byte[] hashBytes = sha256.ComputeHash(titleBytes);
                            titleHash = BitConverter.ToString(hashBytes).Replace("-", "");
                        }
                        bool exists = await dbContext.Articles.AnyAsync(a => a.TitleHash == titleHash, stoppingToken);
                        if (exists)
                        {
                            _logger.LogWarning("Generated article skipped (duplicate title): {Title}", articleDto.Title);
                            continue;
                        }
                        var author = await dbContext.Users.FirstOrDefaultAsync(u => u.Role == Role.SuperAdmin, stoppingToken);
                        if (author == null)
                        {
                            _logger.LogError("No SuperAdmin user found for horror article author.");
                            continue;
                        }
                        articleDto.AuthorId = author.Id;

                        var publisher = scope.ServiceProvider.GetRequiredService<IArticlePublisher>();
                        await publisher.PublishAsync(articleDto);
                        _logger.LogInformation("Published horror article: {Title}", articleDto.Title);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error in HorrorArticleService cycle.");
                    }
                    finally
                    {
                        _gate.Release();
                    }
                }
            }
            finally
            {
                timer.Dispose();
            }
        }
    }
}
