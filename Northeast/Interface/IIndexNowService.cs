namespace Northeast.Interface
{
    public interface IIndexNowService
    {
        public interface IIndexNowService
        {
            string BuildArticleUrl(string slug);
            Task SubmitArticleAsync(string slug, CancellationToken ct = default);
            Task SubmitAsync(IEnumerable<string> urls, CancellationToken ct = default);
        }
    }
}
