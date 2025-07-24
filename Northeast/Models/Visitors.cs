using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class Visitors
    {
        [Key]
        public int Id { get; set; } = new int();

        public User? User { get; set; }

        [ForeignKey(nameof(User))]
        public Guid? UserId { get; set; }

        public string? IpAddress { get; set; }

        public string? Location { get; set; }

        public string? City { get; set; }

        public string? Country { get; set; }

        public string? Region { get; set; }

        public string? Org { get; set; }

        public string? PostalCode { get; set; }

        public string? Timezone { get; set; }

        // Indicates whether the visitor is a guest (not authenticated)
        public bool IsGuest { get; set; }

        public DateTime? VisitTime{ get; set; }
    }
}

   

