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
        public DbSet<RefreshToken> RefreshTokens { get; set; }
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
        public DbSet<AstrologyHoroscope> AstrologyHoroscopes { get; set; }
        public DbSet<AstrologySignForecast> AstrologySignForecasts { get; set; }
        public DbSet<AstrologySubscription> AstrologySubscriptions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Article>(b =>
            {
                b.HasOne(a => a.Author)
                    .WithMany(u => u.Articles)
                    .HasForeignKey(a => a.AuthorId);

                b.HasMany(a => a.Images)
                    .WithOne(i => i.Article)
                    .HasForeignKey(i => i.ArticleId);

                b.HasIndex(a => a.Title);

                b.HasIndex(a => a.UniqueKey)

                    .IsUnique()
                    .HasFilter("\"UniqueKey\" IS NOT NULL");

                b.Navigation(a => a.Images)
                    .AutoInclude();

                b.Property(a => a.Category)
                    .HasConversion<string>()
                    .HasMaxLength(32);

                b.Property(a => a.ArticleType)
                    .HasConversion<string>()
                    .HasMaxLength(32);
            });

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.ParentComment)
                .WithMany()
                .HasForeignKey(c => c.ParentCommentId);

            modelBuilder.Entity<LikeEntity>()
                .HasIndex(l => new { l.UserId, l.ArticleId })
                .IsUnique();

            modelBuilder.Entity<AstrologyHoroscope>(b =>
            {
                b.HasMany(h => h.Signs)
                    .WithOne(s => s.Horoscope)
                    .HasForeignKey(s => s.HoroscopeId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.Navigation(h => h.Signs).AutoInclude();
            });

            modelBuilder.Entity<AstrologySignForecast>(b =>
            {
                b.Property(s => s.LuckyNumbers)
                    .HasColumnType("integer[]");
            });

            modelBuilder.Entity<AstrologySubscription>(b =>
            {
                b.Property(s => s.SendHour).HasDefaultValue(5);
                b.Property(s => s.Active).HasDefaultValue(true);
            });
        }
    }
}
