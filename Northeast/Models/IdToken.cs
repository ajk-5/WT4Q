using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;


namespace Northeast.Models
{
    public class IdToken
    {

        [Key]
        [Required]
        public Guid Id { get; set; }

        [Required]
        public string Token { get; set; }
        [Required]
        public Guid UserId { get; set; }
        [Required]
        public DateTime ExpiryDate { get; set; }
        public bool IsRevoked { get; set; }
        public bool IsUsed { get; set; }

    }
}
