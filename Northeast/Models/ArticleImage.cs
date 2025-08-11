using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class ArticleImage
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public byte[]? Photo { get; set; }
        public string? PhotoLink { get; set; }
        public string? AltText { get; set; }
        public string? Caption { get; set; }

        [ForeignKey(nameof(Article))]
        public Guid ArticleId { get; set; }
        public Article Article { get; set; }
    }
}
