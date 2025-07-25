using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class PageVisit
    {
        [Key]
        public int Id { get; set; }

        public int VisitorId { get; set; }
        [ForeignKey(nameof(VisitorId))]
        public Visitors Visitor { get; set; }

        public string PageUrl { get; set; }

        public DateTime VisitTime { get; set; } = DateTime.UtcNow;
    }
}
