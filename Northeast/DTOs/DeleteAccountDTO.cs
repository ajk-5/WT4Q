using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs
{
    public class DeleteAccountDTO
    {
        [Required]
        public string Password { get; set; }
    }
}
