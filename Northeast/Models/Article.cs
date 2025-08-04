
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class Article
    {
        [Key]
        [Required]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]

        public ArticleType ArticleType { get; set; }

        [Required]
        public Category Category { get; set; }
        [Required]
        public string Title { get; set; }
        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        [Required]
        public string Description { get; set; }

        [DefaultValue(false)]
        public bool IsBreakingNews { get; set; } = false;

        public List<byte[]>? Photo { get; set; }
        public string? PhotoLink { get; set; }
        public string? EmbededCode { get; set; }
        public string? AltText { get; set; }
        public List<Comment>? Comments { get; set; }= new List<Comment>();
        public ICollection<LikeEntity>? Like { get; set; }=new List<LikeEntity>();

        public User Author { get; set; }

        [Required]
        [ForeignKey(nameof(Author.Id))]
        public Guid AuthorId { get; set; }

        public string? CountryName { get; set;}

        public string? CountryCode { get; set;}

        public List<string>? Keywords { get; set; } 
    }
}
