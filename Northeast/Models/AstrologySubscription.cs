using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Northeast.Models
{
    [Index(nameof(UserId), IsUnique = true)]
    [Index(nameof(Email))]
    public class AstrologySubscription
    {
        [Key]
        public int Id { get; set; }

        public Guid UserId { get; set; }

        [Required]
        [MaxLength(320)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(160)]
        public string? UserName { get; set; }

        [Required]
        [MaxLength(32)]
        public string SignId { get; set; } = string.Empty;

        [MaxLength(8)]
        public string? CountryCode { get; set; }

        [Required]
        [MaxLength(120)]
        public string TimeZone { get; set; } = "UTC";

        public int SendHour { get; set; } = 5;

        public DateTime CreatedAtUtc { get; set; }

        public DateTime UpdatedAtUtc { get; set; }

        public DateOnly? LastSentForDate { get; set; }

        public bool Active { get; set; } = true;
    }
}
