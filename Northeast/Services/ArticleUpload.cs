using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using System.Security.Claims; // For working with Claims
using Microsoft.AspNetCore.Http;
using Northeast.Repository;
using Northeast.Utilities;
using Microsoft.EntityFrameworkCore;


namespace Northeast.Services
{
    public class ArticleServices
    {
       
       
        private readonly GetConnectedUser _connectedUser;
        private readonly ArticleRepository _articleRepository;
        private readonly UserRepository _userRepository;
        private readonly LikeRepository _likeRepository;
        private readonly CommentRepository _commentRepository;
        private readonly NotificationRepository _notificationRepository;
        private readonly CommentReportRepository _commentReportRepository;
        private readonly AppDbContext _appDbContext;
        private readonly PageVisitRepository _pageVisitRepository;

        public ArticleServices(GetConnectedUser connectedUser,ArticleRepository articleRepository, UserRepository userRepository, LikeRepository likeRepository, CommentRepository commentRepository, NotificationRepository notificationRepository, CommentReportRepository commentReportRepository, AppDbContext appDbContext, PageVisitRepository pageVisitRepository) {

            _connectedUser = connectedUser;
            _articleRepository= articleRepository;
            _userRepository= userRepository;
            _likeRepository= likeRepository;
            _commentRepository= commentRepository;
            _notificationRepository = notificationRepository;
            _commentReportRepository = commentReportRepository;
            _appDbContext = appDbContext;
            _pageVisitRepository = pageVisitRepository;

        }

        private async Task SetViewsAsync(Article article)
        {
            if (article != null)
            {
                if (string.IsNullOrEmpty(article.Slug))
                {
                    article.Slug = Northeast.Utilities.HtmlText.Slug(article.Title);
                }
                article.Views = await _pageVisitRepository.CountVisitsAsync($"/articles/{article.Slug}");
            }
        }

        private async Task SetViewsAsync(IEnumerable<Article> articles)
        {
            foreach (var a in articles)
            {
                await SetViewsAsync(a);
            }
        }
        public async Task Publish(ArticleDto articleDto)
        {
            await Publish(articleDto, _connectedUser.Id);
        }

        public async Task Publish(ArticleDto articleDto, Guid authorId)
        {
            if (HtmlText.CountWords(articleDto.Content) < 50)
            {
                throw new ArgumentException("Article content must be at least 50 words long.");
            }

            var author = await _appDbContext.Users
                .FirstOrDefaultAsync(u => u.Id == authorId);
            if (author == null || (author.Role != Role.Admin && author.Role != Role.SuperAdmin))
            {
                throw new UnauthorizedAccessException("Author must be an Admin or SuperAdmin.");
            }

            Article article = new Article()
            {
                AuthorId = authorId,
                Title = articleDto.Title,
                Slug = Northeast.Utilities.HtmlText.Slug(articleDto.Title),
                Category = articleDto.Category,
                CreatedDate = DateTime.UtcNow,
                ArticleType = articleDto.ArticleType,
                Content = articleDto.Content,
                IsBreakingNews = articleDto.ArticleType == ArticleType.News && articleDto.IsBreakingNews,
                Keywords = articleDto.Keyword ?? null,
                Images = articleDto.Images?.Select(img => new ArticleImage
                {
                    Photo = img.PhotoLink == null ? img.Photo : null,
                    PhotoLink = img.PhotoLink,
                    AltText = img.AltText,
                    Caption = img.Caption
                }).ToList(),
            };
            if (articleDto.ArticleType == 0)
            {
                article.CountryName = articleDto.CountryName ?? null;
                article.CountryCode = articleDto.CountryCode ?? null;
            }
            await _articleRepository.Add(article);

        }

        public async Task<IEnumerable<Article>> getAllArticle() {
            var articles = await _articleRepository.GetAll();
            await SetViewsAsync(articles);
            return articles;
        }

        public async Task<Article> GetArticleByID(Guid Id) {
            var article = await _appDbContext.Articles
                .AsNoTracking()
                .Include(a => a.Like)
                .Include(a => a.Comments)
                .FirstOrDefaultAsync(a => a.Id == Id);
            await SetViewsAsync(article);
            return article;
        }

        public async Task<Article?> GetArticleBySlug(string slug)
        {
            var article = await _appDbContext.Articles
                .AsNoTracking()
                .Include(a => a.Like)
                .Include(a => a.Comments)
                .FirstOrDefaultAsync(a => a.Slug == slug);
            await SetViewsAsync(article);
            return article;
        }

        public async Task<Article?> GetArticleByGUID(Guid id)
        {
            return await _articleRepository.GetByGUId(id);
        }

        public async Task<IEnumerable<Article>> Search(string query)
        {
            var results = await _articleRepository.Search(query);
            await SetViewsAsync(results);
            return results;
        }

        public async Task<IEnumerable<Article>> Search(string? title, string? keyword, DateTime? date, ArticleType? type, Category? category)
        {
            var results = await _articleRepository.Search(title, keyword, date, type, category);
            await SetViewsAsync(results);
            return results;
        }

        public async Task<IEnumerable<Article>> SearchByArticleType(ArticleType type)
        {
            var results = await _articleRepository.SearchByArticleType(type);
            await SetViewsAsync(results);
            return results;
        }

        public async Task<IEnumerable<Article>> SearchByAuthor(Guid authorId)
        {
            var results = await _articleRepository.SearchByAuthor(authorId);
            await SetViewsAsync(results);
            return results;
        }

        public async Task<IEnumerable<Article>> FilterArticles(Guid? id, string? title, string? content,
            DateTime? date, ArticleType? type, Category? category, Guid? authorId,
            string? countryName, string? countryCode, string? keyword)
        {
            var results = await _articleRepository.Filter(id, title, content, date, type, category, authorId, countryName, countryCode, keyword);
            await SetViewsAsync(results);
            return results;
        }

        public async Task<IEnumerable<Article>> GetRelatedArticles(Guid articleId, int count = 5)
        {
            var results = await _articleRepository.GetRecommendedArticles(articleId, count);
            await SetViewsAsync(results);
            return results;
        }
        public async Task<IEnumerable<Article>> GetBreakingNews()
        {
            var results = await _articleRepository.GetBreakingNews();
            await SetViewsAsync(results);
            return results;
        }
        public async Task<LikeEntity> GetLikeByUserAndArticle(Guid ArticleId)
        {
           var UserId = _connectedUser.Id;
            if (UserId == Guid.Empty) {
                return null;
            }
            var like = await _likeRepository.GetLikeByUserAndArticle(UserId,ArticleId);
            return like;

        }


        public async Task ModifyArticle(Guid id, ArticleDto articleDto)
        {
            if (HtmlText.CountWords(articleDto.Content) < 50)
            {
                throw new ArgumentException("Article content must be at least 50 words long.");
            }

            var article = await _articleRepository.GetByGUId(id);
            if (article == null)
            {
                return;
            }

            article.Title = articleDto.Title;
            article.Slug = Northeast.Utilities.HtmlText.Slug(articleDto.Title);
            article.Category = articleDto.Category;
            article.ArticleType = articleDto.ArticleType;
            article.Content = articleDto.Content;
            article.IsBreakingNews = articleDto.ArticleType == ArticleType.News && articleDto.IsBreakingNews;
            article.Keywords = articleDto.Keyword ?? null;

            if (articleDto.Images != null && articleDto.Images.Any())
            {
                article.Images = articleDto.Images.Select(img => new ArticleImage
                {
                    ArticleId = article.Id,
                    Photo = img.PhotoLink == null ? img.Photo : null,
                    PhotoLink = img.PhotoLink,
                    AltText = img.AltText,
                    Caption = img.Caption
                }).ToList();
            }
            else
            {
                article.Images = new List<ArticleImage>();
            }

            if (articleDto.ArticleType == 0)
            {

                article.CountryName = articleDto.CountryName;
                article.CountryCode = articleDto.CountryCode;
            }
            else
            {
                article.CountryName = null;
                article.CountryCode = null;
            }

            await _articleRepository.Update(article);
        }


        public async Task DeleteArticle(Guid Id)
        {
            var article = await _articleRepository.GetByGUId(Id);

            await _articleRepository.Delete(article);
        }
        /*--------------------------LIKE---------------------------------*/
        public async Task<LikeEntity> getlikeById(int id) {
            var Like = await _likeRepository.GetById(id);
            return Like;
        }


        public async Task AddLike(Guid articleGuid, LikeEntity like)
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty) return;

            var article = await _articleRepository.GetByGUId(articleGuid);
            if (article == null) return;

            if (!await _likeRepository.UserAlreadyLiked(userId, article.Id))
            {
                like.ArticleId = article.Id;
                like.UserId = userId;
                await _likeRepository.Add(like);
            }
        }
        public async Task ModifyLike(Guid articleGuid, LikeEntity like)
        {
            var userId = _connectedUser.Id;
            if (userId == Guid.Empty) return;

            var article = await _articleRepository.GetByGUId(articleGuid);
            if (article == null) return;

            var existingLike = await _likeRepository.GetLikeByUserAndArticle(userId, article.Id);
            if (existingLike != null)
            {
                existingLike.Type = like.Type;
                await _likeRepository.Update(existingLike);
            }
        }




        public async Task DeleteLike(int id) {

            var like = await _likeRepository.GetById(id);
            if (like != null)
            {
                await _likeRepository.Delete(like);
            }
            return;
            
        }

        public async Task<bool> hasLiked(Guid ArticleId) {
            var UserId = _connectedUser.Id;
            var Liked =  await _likeRepository.UserAlreadyLiked(UserId, ArticleId);
            return Liked;


        }
        /*****************************************COMMENTS----------------------------------------------------*/
        public async Task<Comment?> addComment(Guid ArticleId, string CommentContent, Guid? ParentCommentId = null) {

            if (ArticleId == Guid.Empty || string.IsNullOrWhiteSpace(CommentContent))
            {
                return null;
            }

            var article = await _articleRepository.GetByGUId(ArticleId);
            if (article == null)
            {
                return null;
            }
            var UserId = _connectedUser.Id;

            if (UserId == Guid.Empty)
            {
                return null;

            }
            var user = await _userRepository.GetByGUId(UserId);
            if (user == null)
            {
                return null;
            }

            Comment comment = new Comment
            {
                Content = CommentContent,
                Id = Guid.NewGuid(),
                Article = article,
                ArticleId = ArticleId,
                Writer = user,
                CreatedAt = DateTime.UtcNow,
                ParentCommentId = ParentCommentId
            };

            await _commentRepository.Add(comment);

            if (ParentCommentId.HasValue)
            {
                var parent = await _commentRepository.GetByGUId(ParentCommentId.Value);
                if (parent != null && parent.Writer != null && parent.Writer.Id != UserId)
                {
                    var notification = new Notification
                    {
                        Recipient = parent.Writer,
                        RecipientId = parent.Writer.Id,
                        CommentId = comment.Id,
                        Message = "New reply to your comment",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _notificationRepository.Add(notification);
                }
            }

            return comment;

        }

        public async Task ModifyComment(Guid CommentId, string CommentContent)
        {

            var comment = await _commentRepository.GetByGUId(CommentId);
            if (comment == null)
            {
                return;
            }
            var UserId = _connectedUser.Id;

            if (UserId == Guid.Empty)
            {

                return;
            }
            var user = await _userRepository.GetByGUId(UserId);
            if (user == null)
            {
                return;
            }

            comment.Content = CommentContent;
               

            await _commentRepository.Update(comment);

        }

        public async Task<bool> ReportComment(Guid CommentId)
        {
            var comment = await _commentRepository.GetByGUId(CommentId);
            if (comment == null)
            {
                return false;
            }

            var userId = _connectedUser.Id;
            if (userId == Guid.Empty)
            {
                return false;
            }

            var existing = await _commentReportRepository.GetByUserAndComment(userId, CommentId);
            if (existing != null)
            {
                return false;
            }

            var report = new CommentReport
            {
                CommentId = CommentId,
                UserId = userId
            };
            await _commentReportRepository.Add(report);

            comment.ReportCount += 1;
            await _commentRepository.Update(comment);

            var admins = await _appDbContext.Users
                .Where(u => u.Role == Role.Admin || u.Role == Role.SuperAdmin)
                .ToListAsync();
            foreach (var admin in admins)
            {
                var notification = new Notification
                {
                    RecipientId = admin.Id,
                    Message = "A comment was reported",
                    CommentId = comment.Id,
                    CreatedAt = DateTime.UtcNow
                };
                await _notificationRepository.Add(notification);
            }

            return true;
        }
    }
}
