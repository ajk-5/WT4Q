using System.Threading.RateLimiting;

namespace Northeast.Services
{
    /// <summary>
    /// Process-wide AI rate limiter and pacing gate.
    /// Enforces max N requests per minute and a minimum spacing between calls.
    /// Provides a configurable cooldown after 429s.
    /// </summary>
    public static class AiGlobalRateLimiter
    {
        private static FixedWindowRateLimiter _limiter = BuildLimiter(10);
        private static readonly SemaphoreSlim _slotLock = new(1, 1);
        private static DateTimeOffset _nextSlotUtc = DateTimeOffset.MinValue;
        private static DateTimeOffset _cooldownUntilUtc = DateTimeOffset.MinValue;

        // Configurable defaults
        private static int _requestsPerMinute = 10;
        private static TimeSpan _minSpacing = TimeSpan.FromSeconds(6);
        private static TimeSpan _cooldownOn429 = TimeSpan.FromMinutes(2);

        private static FixedWindowRateLimiter BuildLimiter(int rpm) => new(
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = Math.Max(1, rpm),
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 20,
                AutoReplenishment = true
            });

        public static int RequestsPerMinute => _requestsPerMinute;
        public static int MinSpacingSeconds => (int)_minSpacing.TotalSeconds;
        public static int CooldownOn429Seconds => (int)_cooldownOn429.TotalSeconds;

        public static void Configure(int? requestsPerMinute = null, TimeSpan? minSpacing = null, TimeSpan? cooldownOn429 = null)
        {
            if (requestsPerMinute is int rpm && rpm > 0)
            {
                Interlocked.Exchange(ref _limiter, BuildLimiter(rpm));
                _requestsPerMinute = rpm;
            }
            if (minSpacing is TimeSpan ms && ms > TimeSpan.Zero)
                _minSpacing = ms;
            if (cooldownOn429 is TimeSpan cd && cd > TimeSpan.Zero)
                _cooldownOn429 = cd;
        }

        public static async Task WaitPacingAsync(CancellationToken ct)
        {
            await _slotLock.WaitAsync(ct);
            try
            {
                var now = DateTimeOffset.UtcNow;
                if (_cooldownUntilUtc > now)
                {
                    var waitCd = _cooldownUntilUtc - now;
                    _slotLock.Release();
                    try { await Task.Delay(waitCd, ct); }
                    finally { await _slotLock.WaitAsync(ct); }
                }
                now = DateTimeOffset.UtcNow;
                if (_nextSlotUtc > now)
                {
                    var wait = _nextSlotUtc - now;
                    _slotLock.Release();
                    try { await Task.Delay(wait, ct); }
                    finally { await _slotLock.WaitAsync(ct); }
                }
            }
            finally { _slotLock.Release(); }
        }

        public static async Task<RateLimitLease> AcquireAsync(int permits, CancellationToken ct)
        {
            var lease = await _limiter.AcquireAsync(permits, ct);
            return lease;
        }

        public static async Task BumpSpacingAsync(TimeSpan? spacing = null, CancellationToken ct = default)
        {
            var s = spacing ?? _minSpacing;
            await _slotLock.WaitAsync(ct);
            try { _nextSlotUtc = DateTimeOffset.UtcNow + s; }
            finally { _slotLock.Release(); }
        }

        public static async Task ApplyCooldownOn429Async(CancellationToken ct = default)
        {
            await _slotLock.WaitAsync(ct);
            try { _cooldownUntilUtc = DateTimeOffset.UtcNow + _cooldownOn429; }
            finally { _slotLock.Release(); }
        }

        public static async Task ApplyCooldownAsync(TimeSpan cooldown, CancellationToken ct = default)
        {
            if (cooldown <= TimeSpan.Zero) return;
            await _slotLock.WaitAsync(ct);
            try { _cooldownUntilUtc = DateTimeOffset.UtcNow + cooldown; }
            finally { _slotLock.Release(); }
        }
    }
}
