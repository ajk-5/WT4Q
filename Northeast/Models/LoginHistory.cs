using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class LoginHistory
    {
        [Key]
        public int Id { get; set; }

        public Guid UserId { get; set; }
        [ForeignKey(nameof(UserId))]
        public User User { get; set; }

        public string? IpAddress { get; set; }

        public DateTime LoginTime { get; set; } = DateTime.UtcNow;
    }
}
