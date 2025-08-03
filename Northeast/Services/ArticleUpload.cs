using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using System.Security.Claims; // For working with Claims
using Microsoft.AspNetCore.Http;
using Northeast.Repository;
using Northeast.Utilities;
using Microsoft.EntityFrameworkCore;
using Northeast.Data;


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

        public ArticleServices(GetConnectedUser connectedUser,ArticleRepository articleRepository, UserRepository userRepository, LikeRepository likeRepository, CommentRepository commentRepository, NotificationRepository notificationRepository, CommentReportRepository commentReportRepository, AppDbContext appDbContext) {

            _connectedUser = connectedUser;
            _articleRepository= articleRepository;
            _userRepository= userRepository;
            _likeRepository= likeRepository;
            _commentRepository= commentRepository;
            _notificationRepository = notificationRepository;
            _commentReportRepository = commentReportRepository;
            _appDbContext = appDbContext;

        }
        public async Task Publish(ArticleDto articleDto)
        {
           var u = _connectedUser;
            Guid userId = u.Id;

            Article article = new Article()
            {
                AuthorId = userId,
                Title = articleDto.Title,
                Category= articleDto.Category,
                CreatedDate = DateTime.UtcNow,
                ArticleType= articleDto.ArticleType,
                Description= articleDto.Description,
                IsBreakingNews = articleDto.ArticleType == ArticleType.News && articleDto.IsBreakingNews,
                Photo = articleDto.Photo ?? null,
                PhotoLink = articleDto.PhotoLink,
                EmbededCode = articleDto.EmbededCode,
                AltText= articleDto.AltText ?? null,
                Keywords=articleDto.Keyword ?? null,

            };
            if (articleDto.ArticleType == 0)
            {
                article.CountryName = articleDto.CountryName ?? "Global";
                article.CountryCode = articleDto.CountryCode ?? "GL";
            }
            await _articleRepository.Add(article);  
            
        }
        public async Task<IEnumerable<Article>> getAllArticle() {
            return await _articleRepository.GetAll();
        }

        public async Task<Article> GetArticleByID(Guid Id) {
            var Article = await _articleRepository.GetByGUId(Id);
            return Article;
        }

        public async Task<IEnumerable<Article>> Search(string query)
        {
            return await _articleRepository.Search(query);
        }

        public async Task<IEnumerable<Article>> Search(string? title, string? keyword, DateTime? date, ArticleType? type, Category? category)
        {
            return await _articleRepository.Search(title, keyword, date, type, category);
        }

        public async Task<IEnumerable<Article>> SearchByArticleType(ArticleType type)
        {
            return await _articleRepository.SearchByArticleType(type);
        }

        public async Task<IEnumerable<Article>> SearchByAuthor(Guid authorId)
        {
            return await _articleRepository.SearchByAuthor(authorId);
        }

        public async Task<IEnumerable<Article>> FilterArticles(Guid? id, string? title, string? description,
            DateTime? date, ArticleType? type, Category? category, Guid? authorId,
            string? countryName, string? countryCode, string? keyword)
        {
            return await _articleRepository.Filter(id, title, description, date, type, category, authorId, countryName, countryCode, keyword);
        }

        public async Task<IEnumerable<Article>> GetRelatedArticles(Guid articleId, int count = 5)
        {
            return await _articleRepository.GetRecommendedArticles(articleId, count);
        }
        public async Task<IEnumerable<Article>> GetBreakingNews()
        {
            return await _articleRepository.GetBreakingNews();
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
            var article = await _articleRepository.GetByGUId(id);
            if (article == null)
            {
                return;
            }

            article.Title = articleDto.Title;
            article.Category = articleDto.Category;
            article.ArticleType = articleDto.ArticleType;
            article.Description = articleDto.Description;
            article.IsBreakingNews = articleDto.ArticleType == ArticleType.News && articleDto.IsBreakingNews;
            article.Photo = articleDto.Photo;
            article.PhotoLink = articleDto.PhotoLink;
            article.EmbededCode = articleDto.EmbededCode;
            article.AltText = articleDto.AltText;
            article.Keywords = articleDto.Keyword ?? null;

            if (articleDto.ArticleType == 0)
            {

                article.CountryName = articleDto.CountryName ?? "Global";
                article.CountryCode = articleDto.CountryCode ?? "GL";
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


        public async Task AddLike(Guid Id, LikeEntity like)
        {  //modify and add likes 
            var u = _connectedUser;

            var userId = u.Id;

            if (userId == Guid.Empty)
            {
                return;
            }
            var user = await _userRepository.GetByGUId(userId);

            var Article = await _articleRepository.GetByGUId(Id);

            if (!await _likeRepository.UserAlreadyLiked(userId, Article.Id))

            {
                like.Id = new int();
                like.Article = Article;
                like.ArticleId = Article.Id;
                like.Type = like.Type;
                like.User = user;
                like.UserId = userId;

                await _likeRepository.Add(like);

            }
            return;


        }
        public async Task ModifyLike(Guid Id, LikeEntity like)
        {
            var u = _connectedUser;

            var userId = u.Id;

            if (userId == Guid.Empty)
            {
                return;
            }

            var Article = await _articleRepository.GetByGUId(Id);

            if (await _likeRepository.UserAlreadyLiked(userId, Article.Id))
            {
                var Like = await _likeRepository.GetLikeByUserAndArticle(userId, Article.Id);

                Like.Type = like.Type;
                await _likeRepository.Update(like);
                return;
            }
            return;
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

            var admins = await _appDbContext.Admins.ToListAsync();
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
