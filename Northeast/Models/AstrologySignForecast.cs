using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Northeast.Models
{
    [Index(nameof(HoroscopeId), nameof(SignId), IsUnique = true)]
    public class AstrologySignForecast
    {
        [Key]
        public int Id { get; set; }

        public int HoroscopeId { get; set; }

        public AstrologyHoroscope Horoscope { get; set; } = null!;

        [Required]
        [MaxLength(32)]
        public string SignId { get; set; } = string.Empty;

        [Required]
        public string Headline { get; set; } = string.Empty;

        [Required]
        public string Summary { get; set; } = string.Empty;

        [Required]
        public string Energy { get; set; } = string.Empty;

        [Required]
        public string OutlookGeneral { get; set; } = string.Empty;

        [Required]
        public string OutlookLove { get; set; } = string.Empty;

        [Required]
        public string OutlookCareer { get; set; } = string.Empty;

        [Required]
        public string OutlookWellness { get; set; } = string.Empty;

        [Required]
        public string RelationsPeople { get; set; } = string.Empty;

        [Required]
        public string RelationsPets { get; set; } = string.Empty;

        [Required]
        public string RelationsPlanets { get; set; } = string.Empty;

        [Required]
        public string RelationsStars { get; set; } = string.Empty;

        [Required]
        public string RelationsStones { get; set; } = string.Empty;

        [Required]
        public string GuidanceRitual { get; set; } = string.Empty;

        [Required]
        public string GuidanceReflection { get; set; } = string.Empty;

        [Required]
        public string GuidanceAdventure { get; set; } = string.Empty;

        [Required]
        public string Mood { get; set; } = string.Empty;

        [Required]
        public string Color { get; set; } = string.Empty;

        [Required]
        public string Mantra { get; set; } = string.Empty;

        public int[] LuckyNumbers { get; set; } = Array.Empty<int>();
    }
}
