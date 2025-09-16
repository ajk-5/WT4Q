using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Northeast.Models
{
    [Index(nameof(ForDate), IsUnique = true)]
    public class AstrologyHoroscope
    {
        [Key]
        public int Id { get; set; }

        public DateOnly ForDate { get; set; }

        public DateTime GeneratedAtUtc { get; set; }

        [Required]
        public string Summary { get; set; } = string.Empty;

        [Required]
        public string CosmicWeather { get; set; } = string.Empty;

        [Required]
        public string LunarPhase { get; set; } = string.Empty;

        [Required]
        public string Highlight { get; set; } = string.Empty;

        public ICollection<AstrologySignForecast> Signs { get; set; } = new List<AstrologySignForecast>();
    }
}
