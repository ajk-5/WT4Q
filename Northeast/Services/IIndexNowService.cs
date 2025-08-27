using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Northeast.Services
{
    public interface IIndexNowService
    {
        string BuildArticleUrl(string slug);
        Task SubmitArticleAsync(string slug, CancellationToken ct = default);
        Task SubmitAsync(IEnumerable<string> urls, CancellationToken ct = default);
    }
}

