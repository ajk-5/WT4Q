using System.ComponentModel.DataAnnotations;

namespace Northeast.Models
{
    public class RefreshToken
    {
        [Key]
        public Guid Id { get; set; }
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public string TokenHash { get; set; }
        [Required]
        public DateTime ExpiresAtUtc { get; set; }
        [Required]
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? RevokedAtUtc { get; set; }
        public string? ReplacedByTokenHash { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
    }
}
