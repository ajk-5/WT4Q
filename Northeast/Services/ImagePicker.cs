using System.Text.Json;
using System.Linq;
using System.Net.Http;
using Northeast.Models;

namespace Northeast.Services;

public interface IImagePicker
{
    Task<List<ArticleImage>> FindAsync(string title, IEnumerable<string> keywords, int max, CancellationToken ct);
}

public sealed class WikimediaImagePicker : IImagePicker
{
    private readonly HttpClient _http;
    public WikimediaImagePicker(HttpClient http) => _http = http;

    public async Task<List<ArticleImage>> FindAsync(string title, IEnumerable<string> keywords, int max, CancellationToken ct)
    {
        var q = Uri.EscapeDataString(title);
        var url = $"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={q}&gsrlimit=8&prop=imageinfo|info&iiprop=url|extmetadata&inprop=url&format=json&origin=*";
        using var res = await _http.GetAsync(url, ct);
        if (!res.IsSuccessStatusCode) return new();

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        if (!doc.RootElement.TryGetProperty("query", out var qEl) || !qEl.TryGetProperty("pages", out var pages)) return new();

        var list = new List<ArticleImage>();
        foreach (var p in pages.EnumerateObject().Select(o => o.Value))
        {
            if (!p.TryGetProperty("imageinfo", out var ii) || ii.GetArrayLength() == 0) continue;
            var info = ii[0];
            var link = info.GetProperty("url").GetString();
            if (string.IsNullOrWhiteSpace(link)) continue;

            var caption = p.TryGetProperty("title", out var t) ? t.GetString() : title;
            list.Add(new ArticleImage
            {
                PhotoLink = link,
                AltText = caption,
                Caption = caption
            });
            if (list.Count >= max) break;
        }
        return list;
    }
}
