using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Northeast.Services
{
    public interface IAiTransientCache
    {
        bool TryGet(string key, out string json);
        void Set(string key, string json, TimeSpan? ttl = null);
        void Remove(string key);
    }

    public sealed class AiTransientCache : IAiTransientCache
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<AiTransientCache> _log;

        // Defaults: short-lived cache to smooth retries and avoid 429s
        private static readonly TimeSpan DefaultAbsoluteTtl = TimeSpan.FromMinutes(10);
        private static readonly TimeSpan DefaultSlidingTtl = TimeSpan.FromMinutes(3);

        public AiTransientCache(IMemoryCache cache, ILogger<AiTransientCache> log)
        { _cache = cache; _log = log; }

        public bool TryGet(string key, out string json)
        {
            if (_cache.TryGetValue(key, out string? s) && !string.IsNullOrWhiteSpace(s))
            {
                json = s!;
                return true;
            }
            json = string.Empty;
            return false;
        }

        public void Set(string key, string json, TimeSpan? ttl = null)
        {
            if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(json)) return;
            try
            {
                var opts = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = ttl ?? DefaultAbsoluteTtl,
                    SlidingExpiration = DefaultSlidingTtl
                };
                _cache.Set(key, json, opts);
            }
            catch (Exception ex)
            {
                _log.LogDebug(ex, "Failed to set AI cache for {Key}", key);
            }
        }

        public void Remove(string key)
        {
            try { _cache.Remove(key); }
            catch (Exception ex) { _log.LogDebug(ex, "Failed to remove AI cache for {Key}", key); }
        }
    }
}

