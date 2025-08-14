using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Northeast.Models;

namespace Northeast.Services.Similarity
{
    public interface ITokenizationService
    {
        IEnumerable<string> Tokenize(string? text);
        HashSet<string> CollectTokens(Article article);
    }

    public class TokenizationService : ITokenizationService
    {
        private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
        {
            // English WH + stopwords
            "what","where","when","how","who","which","why",
            "the","a","an","of","in","on","at","to","from","by","for","with","about",
            "am","is","are","was","were","be","been","being","do","does","did","doing",
            "i","you","he","she","it","we","they","me","him","her","us","them",
            "this","that","these","those","can","could","should","would","may","might",
            // French stopwords
            "quoi","où","quand","comment","qui","quel","quelle","pourquoi",
            "le","la","les","un","une","des","du","de","d","au","aux",
            "et","ou","mais","donc","ni","car","ne","pas","plus","moins","très","trop",
            "je","tu","il","elle","nous","vous","ils","elles"
        };

        private static readonly HashSet<string> ElisionPrefixes = new(StringComparer.Ordinal)
        {
            "l","d","j","c","s","t","m","n","qu"
        };

        public IEnumerable<string> Tokenize(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
                yield break;

            var normalized = RemoveDiacritics(text.ToLowerInvariant());

            foreach (var raw in Regex.Split(normalized, @"[^a-z0-9']+"))
            {
                var tok = raw.Trim('\'');
                if (tok.Length < 2) continue;

                // French elisions (l'amour -> amour)
                var apos = tok.IndexOf('\'');
                if (apos > 0)
                {
                    var prefix = tok[..apos];
                    if (ElisionPrefixes.Contains(prefix))
                    {
                        tok = tok[(apos + 1)..];
                        if (tok.Length < 2) continue;
                    }
                }

                // Numbers skip
                if (tok.All(char.IsDigit)) continue;

                // Stopwords skip
                if (StopWords.Contains(tok)) continue;

                yield return tok;
            }
        }

        public HashSet<string> CollectTokens(Article article)
        {
            var tokens = new HashSet<string>(StringComparer.Ordinal);

            if (!string.IsNullOrWhiteSpace(article.Title))
                foreach (var t in Tokenize(article.Title))
                    tokens.Add(t);

            if (!string.IsNullOrWhiteSpace(article.Content))
                foreach (var t in Tokenize(article.Content))
                    tokens.Add(t);

            if (article.Keywords != null)
                foreach (var k in article.Keywords)
                    foreach (var t in Tokenize(k))
                        tokens.Add(t);

            return tokens;
        }

        private static string RemoveDiacritics(string input)
        {
            var normalized = input.Normalize(NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder();
            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    sb.Append(ch);
            }
            return sb.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
