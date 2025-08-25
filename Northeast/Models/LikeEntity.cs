using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class LikeEntity
    {
        [Key]
        [Required]
        public int Id { get; set; } // Primary Key
        public LikeType Type { get; set; } // Enum for Like, Sad, etc.

        [ForeignKey(nameof(User))]
        public Guid UserId { get; set; } // Who liked it

        [ForeignKey(nameof(Article))]
        public Guid ArticleId { get; set; } // What article was liked

        public User User { get; set; } // Relationship
        public Article Article { get; set; } // Relationship
    }
}
