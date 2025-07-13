using Northeast.Data;
using Northeast.DTOs;
using Northeast.Models;
using System.Security.Claims; // For working with Claims
using Microsoft.AspNetCore.Http;
using Northeast.Repository;
using Northeast.Utilities;


namespace Northeast.Services
{
    public class ArticleServices
    {
       
       
        private readonly GetConnectedUser _connectedUser;
        private readonly ArticleRepository _articleRepository;
        private readonly UserRepository _userRepository;
        private readonly LikeRepository _likeRepository;
        private readonly CommentRepository _commentRepository;
        
        public ArticleServices(GetConnectedUser connectedUser,ArticleRepository articleRepository, UserRepository userRepository, LikeRepository likeRepository, CommentRepository commentRepository) { 
        
            _connectedUser = connectedUser;
            _articleRepository= articleRepository;
            _userRepository= userRepository;
            _likeRepository= likeRepository;
            _commentRepository= commentRepository;
   
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
                Photo = articleDto.Photo ?? null,
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
        public async Task<LikeEntity> GetLikeByUserAndArticle(Guid ArticleId)
        {
           var UserId = _connectedUser.Id;
            if (UserId == Guid.Empty) {
                return null;
            }
            var like = await _likeRepository.GetLikeByUserAndArticle(UserId,ArticleId);
            return like;

        }


        public async Task ModifyArticle(Guid id, ArticleDto articleDto) {

            var Article = await _articleRepository.GetByGUId(id);

            Article article = new Article()
            {
                Title = articleDto.Title,
                Category = articleDto.Category,
                ArticleType = articleDto.ArticleType,
                Description = articleDto.Description,
                Photo = articleDto.Photo,
                AltText = articleDto.AltText,
              

            };
            if (articleDto.ArticleType == 0) { 
                article.CountryName = articleDto.CountryName ?? "Global";
                article.CountryCode = articleDto.CountryCode ?? "GL";

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

            if (userId != Guid.Empty)
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

            if (userId != Guid.Empty)
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
        public async Task addComment(Guid ArticleId, string CommentContent) {

            if (ArticleId != Guid.Empty || CommentContent=="")
            {
                return;
            }

            var article =await _articleRepository.GetByGUId(ArticleId);
            if (article != null)
            {
                return;
            }
            var UserId = _connectedUser.Id;

            if (UserId != Guid.Empty) {
                return;

            }
            var user = await _userRepository.GetByGUId(UserId);
            if (user == null)
            {
                return;
            }

            Comment comment = new Comment { 
              Content = CommentContent,
              Id = new Guid(),
              Article = article,
              ArticleId = ArticleId,
              Writer = user,
              CreatedAt = DateTime.UtcNow
            };

            await _commentRepository.Add(comment);

        }

        public async Task ModifyComment(Guid CommentId, string CommentContent)
        {

            var comment = await _commentRepository.GetByGUId(CommentId);
            if (comment != null)
            {
                return;
            }
            var UserId = _connectedUser.Id;

            if (UserId != Guid.Empty)
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
    }
}
