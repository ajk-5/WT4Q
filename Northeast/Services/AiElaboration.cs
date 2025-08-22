using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Northeast.Services;

internal static class AiElaboration
{
    public static Task<AiArticleDraft> ExpandToMinWordsAsync(
        IGenerativeTextClient ai,
        AiNewsOptions opts,
        AiArticleDraft d,
        IEnumerable<string> recent,
        DateTimeOffset now,
        CancellationToken ct)
    {
        // Placeholder: return draft unchanged
        return Task.FromResult(d);
    }
}
