using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class Comment
    {
        [Key]
        [Required]
        public Guid Id { get; set; }= Guid.NewGuid();

        public string Content { get; set; }

        public User Writer { get; set; }

        public Article Article { get; set; }

        [ForeignKey(nameof(Article))]
        public Guid ArticleId { get; set; }

        public Guid? ParentCommentId { get; set; }
        public Comment? ParentComment { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime LastUpdated { get; set; }
    }
}
