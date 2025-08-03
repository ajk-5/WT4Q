using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class Notification
    {
        [Key]
        [Required]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey(nameof(Recipient))]
        public Guid RecipientId { get; set; }
        public User Recipient { get; set; }

        [ForeignKey(nameof(Comment))]
        public Guid? CommentId { get; set; }
        public Comment? Comment { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

