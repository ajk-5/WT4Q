using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs
{
    public class UserRegisterDTO
    {
        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }


        [Phone]
        public string? PhoneNumber { get; set; }

        [Required]
        [MinLength(6)]
        public string? Password { get; set; }

        [Required]
        public string? ConfirmPassword { get; set; }

        [Required]
        public DateOnly DOB { get; set; }
    }
}
