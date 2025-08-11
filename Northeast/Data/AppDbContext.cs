using Microsoft.EntityFrameworkCore;
using Northeast.Models;

namespace Northeast.Data
{
    public class AppDbContext : DbContext
    {
        protected readonly IConfiguration Configuration;

        public AppDbContext(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseNpgsql(Configuration.GetConnectionString("bdd"));
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Article> Articles { get; set; }
        public DbSet<ArticleImage> ArticleImages { get; set; }
        public DbSet<IdToken> IdTokens { get; set; }
        public DbSet<LikeEntity> Likes { get; set; }
        public DbSet<OTP> OTPs { get; set; }
        public DbSet<Visitors> Visitors { get; set; }
        public DbSet<Cocktail> Cocktails { get; set; }
        public DbSet<Ingridient> Ingridients { get; set; }
        public DbSet<IngridientQuantity> IngridientQuantities { get; set; }
        public DbSet<LoginHistory> LoginHistories { get; set; }
        public DbSet<PageVisit> PageVisits { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<CommentReport> CommentReports { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Article>()
                .HasOne(a => a.Author)
                .WithMany(u => u.Articles)
                .HasForeignKey(a => a.AuthorId);

            modelBuilder.Entity<Article>()
                .HasMany(a => a.Images)
                .WithOne(i => i.Article)
                .HasForeignKey(i => i.ArticleId);

            modelBuilder.Entity<Article>()
                .Navigation(a => a.Images)
                .AutoInclude();

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.ParentComment)
                .WithMany()
                .HasForeignKey(c => c.ParentCommentId);
        }
    }
}
