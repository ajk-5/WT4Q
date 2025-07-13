using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs
{
    public class AdminLoginDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
}