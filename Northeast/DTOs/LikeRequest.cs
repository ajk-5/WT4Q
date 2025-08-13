using System.ComponentModel.DataAnnotations;

namespace Northeast.DTOs
{
    public sealed class LikeRequest
    {
        [Required]
        public int Type { get; set; }
    }
}
