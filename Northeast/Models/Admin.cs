
using System.ComponentModel.DataAnnotations;

namespace Northeast.Models
{
    public class Admin
    {
        [Key]
        [Required]
        public Guid Id { get; set; }
        [Required]
        public string AdminName { get; set; }
        [Required]
        public string Password { get; set; }
        [Required]
        public string Email { get; set; }

        public List<Article> Articles { get; set; }

    }
}
