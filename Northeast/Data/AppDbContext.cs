using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Northeast.Models;



namespace Northeast.Data
{
    public class AppDbContext : DbContext
    {
        protected readonly IConfiguration Configuration; //attribut configuration

        public AppDbContext(IConfiguration configuration)
        {
            Configuration = configuration;
        }
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseNpgsql(Configuration.GetConnectionString("bdd"));
        }
        public DbSet<User> Users { get; set; }

        public DbSet<Admin> Admins { get; set; }
        public DbSet<Article> Articles { get; set; }
        public DbSet<IdToken> IdTokens { get; set; }

        public DbSet<LikeEntity> Likes { get; set; }

        public DbSet<OTP> OTPs { get; set; }

        public DbSet<Visitors> Visitors { get; set; }

        public DbSet<Cocktail> Cocktails { get; set; }
        public DbSet<Ingridient> Ingridients { get; set; }
        public DbSet<IngridientQuantity> IngridientQuantities { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Article>()
                .HasOne(a => a.Author)
                .WithMany(u => u.Articles)
                .HasForeignKey(a => a.AuthorId);

            modelBuilder.Entity<Admin>().HasData(
                    new Admin
                    {
                        Id = Guid.Parse("3bc99596-5eac-481a-b758-c4b2c5ba239f"),
                        AdminName = "AJK",
                        
                        Email = "anamoljang@gmail.com",
                        Password= "$2a$10$e/ClUCcy1Ctn1Sy/ZMvkcuzSJXk0YvvD1m1s/JuhFTmrmmEjOIrI."
                    }
                );

            modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = Guid.Parse("3bc99596-5eac-481a-b758-c4b2c5ba239f"),
                UserName = "AJK",
                isVerified = true,
                Email = "anamoljang@gmail.com",
                Password = "$2a$10$e/ClUCcy1Ctn1Sy/ZMvkcuzSJXk0YvvD1m1s/JuhFTmrmmEjOIrI."
            }
    );

        }
    }
}
