using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class OTP
    {
        [Key]
        public int Id { get; set; }

        public string SixDigit { get; set; }
        public DateTime CreatedAt { get; set; } 
        public DateTime ValidUntil {  get; set; }
        public bool IsValid { get; set; } 

        public User User { get; set; }

        [ForeignKey(nameof(User))]
        public Guid UserId { get; set; }
    }
}
