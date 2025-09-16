using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Northeast.Services.Astrology
{
    public class AstrologyEmailBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AstrologyEmailBackgroundService> _logger;
        private readonly TimeSpan _interval;

        public AstrologyEmailBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<AstrologyEmailBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _interval = TimeSpan.FromMinutes(5);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Astrology email dispatcher started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var dispatcher = scope.ServiceProvider.GetRequiredService<AstrologyDispatcher>();
                    await dispatcher.DispatchAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Astrology email dispatch tick failed.");
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("Astrology email dispatcher stopping.");
        }
    }
}
