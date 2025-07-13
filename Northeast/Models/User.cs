using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Northeast.Models
{
    [Index(nameof(Email), IsUnique = true)]
    [Index(nameof(Id), IsUnique = true)]
    public class User
    {
        [Key]
        [Required]
        public Guid Id { get; set; } 

        [Required]
        public string UserName { get; set; }
        [Required]
        public string Email { get; set; }
        public string? Password { get; set; }

        public DateOnly? DOB { get; set; }
        public string? Phone { get; set; }

        public bool isVerified { get; set; }

        public ICollection<Article> Articles { get; set; }

    }
}
