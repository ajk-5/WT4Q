using System.Text.Json;
using Microsoft.Extensions.Configuration;
using System.Net.Http;

namespace Northeast.Services;

public interface INewsFetcher
{
    Task<List<(string Title, string Url, DateTimeOffset PublishedUtc)>> FetchAsync(int max, CancellationToken ct);
}

public sealed class BingNewsFetcher : INewsFetcher
{
    private readonly HttpClient _http;
    private readonly string _key;
    public BingNewsFetcher(HttpClient http, IConfiguration cfg)
    {
        _http = http;
        _key = cfg["Bing:NewsKey"] ?? string.Empty;
    }

    public async Task<List<(string, string, DateTimeOffset)>> FetchAsync(int max, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.bing.microsoft.com/v7.0/news/search?q=top%20news&count={max}&mkt=en-US&freshness=Month");
        req.Headers.TryAddWithoutValidation("Ocp-Apim-Subscription-Key", _key);
        using var res = await _http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode) return new();

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        var list = new List<(string, string, DateTimeOffset)>();
        foreach (var v in doc.RootElement.GetProperty("value").EnumerateArray())
        {
            var title = v.GetProperty("name").GetString() ?? string.Empty;
            var url = v.GetProperty("url").GetString() ?? string.Empty;
            var date = v.TryGetProperty("datePublished", out var d) && DateTimeOffset.TryParse(d.GetString(), out var ts) ? ts : DateTimeOffset.UtcNow;
            list.Add((title, url, date));
        }
        return list;
    }
}
