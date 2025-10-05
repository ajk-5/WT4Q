using System.Collections.Concurrent;
using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Northeast.DTOs;
using Northeast.Models;

namespace Northeast.Services
{
    public enum AiWriteJobStatus { Queued, Running, Succeeded, Failed }

    public sealed class AiWriteJob
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public Guid AuthorId { get; init; }
        public AiWriteRequestDto Request { get; init; }
        public DateTime CreatedUtc { get; init; } = DateTime.UtcNow;
        public AiWriteJobStatus Status { get; set; } = AiWriteJobStatus.Queued;
        public string? Error { get; set; }
        public string? Slug { get; set; }
    }

    public interface IAiWriteQueue
    {
        AiWriteJob Enqueue(Guid authorId, AiWriteRequestDto req);
        bool TryGet(Guid id, out AiWriteJob job);
        ValueTask<AiWriteJob> DequeueAsync(CancellationToken ct);
    }

    public sealed class AiWriteQueue : IAiWriteQueue
    {
        private readonly Channel<AiWriteJob> _queue = Channel.CreateBounded<AiWriteJob>(new BoundedChannelOptions(16)
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait
        });
        private readonly ConcurrentDictionary<Guid, AiWriteJob> _jobs = new();

        public AiWriteJob Enqueue(Guid authorId, AiWriteRequestDto req)
        {
            var job = new AiWriteJob { AuthorId = authorId, Request = req };
            _jobs[job.Id] = job;
            _queue.Writer.TryWrite(job);
            return job;
        }

        public bool TryGet(Guid id, out AiWriteJob job) => _jobs.TryGetValue(id, out job!);

        public async ValueTask<AiWriteJob> DequeueAsync(CancellationToken ct)
        {
            var job = await _queue.Reader.ReadAsync(ct);
            return job;
        }
    }

    public sealed class AiWriteWorker : BackgroundService
    {
        private readonly ILogger<AiWriteWorker> _log;
        private readonly IAiWriteQueue _queue;
        private readonly IServiceScopeFactory _scopeFactory;

        public AiWriteWorker(ILogger<AiWriteWorker> log, IAiWriteQueue queue, IServiceScopeFactory scopeFactory)
        { _log = log; _queue = queue; _scopeFactory = scopeFactory; }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _log.LogInformation("AiWriteWorker started.");
            while (!stoppingToken.IsCancellationRequested)
            {
                AiWriteJob job;
                try { job = await _queue.DequeueAsync(stoppingToken); }
                catch (OperationCanceledException) { break; }
                _ = Process(job, stoppingToken);
            }
            _log.LogInformation("AiWriteWorker stopping.");
        }

        private async Task Process(AiWriteJob job, CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var writer = scope.ServiceProvider.GetRequiredService<AiArticleWriterService>();
            var svc = scope.ServiceProvider.GetRequiredService<ArticleServices>();
            var aiCache = scope.ServiceProvider.GetService<IAiTransientCache>();
            try
            {
                job.Status = AiWriteJobStatus.Running;

                var dto = job.Request.ArticleType == ArticleType.News && job.Request.UseRecentNews
                    ? await writer.WriteFromRecentNewsAsync(job.AuthorId, job.Request, ct)
                    : await writer.WriteFromTopicAsync(job.AuthorId, job.Request, ct);

                if (dto == null) throw new InvalidOperationException("AI returned no content");

                // Enforce type/category and publish under author
                dto.ArticleType = job.Request.ArticleType;
                dto.Category = job.Request.Category;
                if (dto.ArticleType != ArticleType.News) dto.IsBreakingNews = false;

                // Compute slug same way as ArticleServices does
                var slug = Northeast.Utilities.HtmlText.Slug(dto.Title);
                await svc.Publish(dto, job.AuthorId);

                job.Slug = slug;
                job.Status = AiWriteJobStatus.Succeeded;
                _log.LogInformation("AI job {Id} published as {Slug}", job.Id, slug);

                // Clear transient AI cache for this request to free memory
                var key = job.Request.UseRecentNews
                    ? null
                    : $"topic:{job.Request.Category}|{(job.Request.Topic ?? string.Empty).Trim().ToLowerInvariant()}";
                if (key is not null)
                    aiCache?.Remove(key);
            }
            catch (Exception ex)
            {
                job.Status = AiWriteJobStatus.Failed;
                job.Error = ex.Message;
                _log.LogError(ex, "AI job {Id} failed", job.Id);
            }
        }
    }
}
