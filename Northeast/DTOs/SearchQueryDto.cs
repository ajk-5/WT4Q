using System;
using System.ComponentModel.DataAnnotations;
using Northeast.Models;

namespace Northeast.DTOs
{
    public class SearchQueryDto
    {
        public string? Q { get; set; }
        public string? Title { get; set; }
        public string? Keyword { get; set; }
        public string? CountryName { get; set; }
        public string? CountryCode { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public ArticleType? Type { get; set; }
        public Category? Category { get; set; }
        public bool? IsBreaking { get; set; }
        public bool? HasImages { get; set; }

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 20;

        // date_desc, date_asc, relevance
        public string Sort { get; set; } = "date_desc";
    }
}

