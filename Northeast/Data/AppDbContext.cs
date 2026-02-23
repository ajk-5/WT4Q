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
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<QuizQuestion> QuizQuestions { get; set; }
        public DbSet<Show> Shows { get; set; }
        public DbSet<ShowTrivia> ShowTrivias { get; set; }

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
                    .HasConversion(
                        v => v.ToString(),
                        v => EnumCoercion.ParseCategory(v))
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

            modelBuilder.Entity<Quiz>(b =>
            {
                b.HasIndex(q => q.Slug).IsUnique();
                b.Property(q => q.Status).HasMaxLength(16);
                b.Property(q => q.Type).HasMaxLength(32);
                b.Property(q => q.Title).HasMaxLength(256);
                b.HasMany(q => q.Questions)
                    .WithOne(qq => qq.Quiz!)
                    .HasForeignKey(qq => qq.QuizId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(q => q.Show)
                    .WithMany()
                    .HasForeignKey(q => q.ShowId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<QuizQuestion>(b =>
            {
                b.Property(qq => qq.Points).HasDefaultValue(1);
                b.Property(qq => qq.Difficulty).HasMaxLength(16);
                b.HasIndex(qq => new { qq.QuizId, qq.Order });
            });

            modelBuilder.Entity<Show>(b =>
            {
                b.HasIndex(s => s.Slug).IsUnique();
                b.HasIndex(s => s.Title);
                b.Property(s => s.Kind).HasMaxLength(16);
                b.HasMany(s => s.Trivias)
                    .WithOne(t => t.Show!)
                    .HasForeignKey(t => t.ShowId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ShowTrivia>(b =>
            {
                b.Property(t => t.Text).HasMaxLength(1024);
                b.HasIndex(t => new { t.ShowId, t.CreatedAtUtc });
            });
        }
    }

    internal static class EnumCoercion
    {
        public static Category ParseCategory(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return Category.Info;

            var trimmed = value.Trim();
            if (trimmed.Equals("Crypto", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Equals("CryptoCurrency", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = nameof(Category.Cryptocurrency);
            }

            if (Enum.TryParse<Category>(trimmed, ignoreCase: true, out var parsed))
                return parsed;

            return Category.Info;
        }
    }
}
