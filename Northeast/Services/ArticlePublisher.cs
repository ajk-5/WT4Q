using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Northeast.Data;
using Northeast.Models;
using Northeast.Ai;

namespace Northeast.Services
{
    public interface IArticlePublisher
    {
        Task PublishAsync(ArticleDto articleDto);
    }

    public class ArticlePublisher : IArticlePublisher
    {
        private readonly AppDbContext _dbContext;
        public ArticlePublisher(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task PublishAsync(ArticleDto articleDto)
        {
            string titleHash;
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] titleBytes = Encoding.UTF8.GetBytes(articleDto.Title.ToLowerInvariant());
                byte[] hashBytes = sha256.ComputeHash(titleBytes);
                titleHash = BitConverter.ToString(hashBytes).Replace("-", "");
            }

            var articleEntity = new Article
            {
                ArticleType = ArticleType.News,
                Category = Enum.TryParse<Category>(articleDto.CategoryName, true, out var cat) ? cat : Category.Info,
                Title = articleDto.Title,
                TitleHash = titleHash,
                Content = articleDto.Content,
                Keywords = articleDto.Keywords ?? new List<string>(),
                CountryName = articleDto.CountryName,
                CountryCode = articleDto.CountryCode,
                AuthorId = articleDto.AuthorId,
                CreatedDate = DateTime.UtcNow,
                Images = new List<ArticleImage>()
            };

            if (!string.IsNullOrEmpty(articleDto.ImageUrl))
            {
                articleEntity.Images.Add(new ArticleImage
                {
                    PhotoLink = articleDto.ImageUrl,
                    AltText = articleDto.ImageAlt,
                    Caption = articleDto.ImageCaption
                });
            }

            _dbContext.Articles.Add(articleEntity);
            await _dbContext.SaveChangesAsync();
        }
    }
}
