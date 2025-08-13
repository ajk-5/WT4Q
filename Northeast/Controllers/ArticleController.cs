using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Services;
using Northeast.Repository;
using Northeast.Utilities;


namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ArticleController : ControllerBase
    {
        private readonly ArticleServices articleUpload;
        private readonly LikeRepository _likeRepository;
        private readonly GetConnectedUser _connectedUser;

        public ArticleController(ArticleServices _articleUpload, LikeRepository likeRepository, GetConnectedUser connectedUser)
        {
            articleUpload = _articleUpload;
            _likeRepository = likeRepository;
            _connectedUser = connectedUser;
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> Publish([FromBody] ArticleDto article)
        {
            try
            {
                await articleUpload.Publish(article);
                return Ok(article);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal error while publishing article", error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {


            var articles = await articleUpload.getAllArticle();
            if (articles == null)
            {
                return NotFound(new { message = "Sorry, there is no Articles to show" });
            }
            return Ok(articles);

        }

        [HttpGet("breaking")]
        public async Task<IActionResult> GetBreakingNews()
        {
            var articles = await articleUpload.GetBreakingNews();
            if (!articles.Any())
            {
                return NotFound(new { message = "No breaking news available" });
            }
            return Ok(articles);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (id == Guid.Empty)
            {
                return BadRequest(new { message = "Please enter an Id" });
            }

            var article = await articleUpload.GetArticleByID(id);
            if (article == null)
            {
                return NotFound(new { message = "Sorry, no article found with this ID" });
            }

            return Ok(article);
        }

        [HttpGet("{id}/recommendations")]
        public async Task<IActionResult> GetRecommendations(Guid id, [FromQuery] int count = 5)
        {
            if (id == Guid.Empty)
            {
                return BadRequest(new { message = "Please enter an Id" });
            }

            var recommendations = await articleUpload.GetRelatedArticles(id, count);
            if (!recommendations.Any())
            {
                return NotFound(new { message = "No related articles found" });
            }

            return Ok(recommendations);
        }
        [Authorize(Policy = "AdminOnly")]
        [HttpPut]
        public async Task<IActionResult> EditArticle(Guid Id, ArticleDto Article)
        {
            if (Id == Guid.Empty)
            {
                return BadRequest(new { message = "Please enter an Id" });
            }

            if (Article == null)
            {
                return BadRequest(new { message = "Sorry, there is no ID" });
            }
            var article = await articleUpload.GetArticleByID(Id);
            if (article == null)
            {
                return NotFound(new { message = "Sorry, there is no Articles with this ID" });
            }
            await articleUpload.ModifyArticle(Id, Article);
            return Ok(article);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpDelete]
        public async Task<IActionResult> DeleteArticle(Guid Id)
        {
            var article = await articleUpload.GetArticleByID(Id);


            if (article == null)
            {
                return BadRequest(new { message = "Sorry, no article found with this ID" });
            }

            await articleUpload.DeleteArticle(Id);

            return Ok(new { message = "The article has been deleted" });
        }
        [Authorize]
        [HttpPut("{id:guid}/like")]
        public async Task<IActionResult> Like([FromRoute] Guid id, [FromBody] LikeRequest req)
        {
            if (id == Guid.Empty)
            {
                return BadRequest(new { message = "Please enter an Id" });
            }

            var article = await articleUpload.GetArticleByGUID(id);
            if (article == null)
            {
                return NotFound(new { message = "Sorry, no article found with this ID" });
            }

            var userId = _connectedUser?.Id ?? Guid.Empty;
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var likeType = (LikeType)req.Type;
            var existingLike = await _likeRepository.GetLikeByUserAndArticle(userId, article.Id);

            if (existingLike != null && existingLike.Type == likeType)
            {
                await _likeRepository.Delete(existingLike);
                return Ok(new { message = "unliked" });
            }

            if (existingLike != null)
            {
                existingLike.Type = likeType;
                await _likeRepository.Update(existingLike);
                return Ok(new { message = "Like changed" });
            }

            var like = new LikeEntity
            {
                ArticleId = article.Id,
                UserId = userId,
                Type = likeType
            };

            await _likeRepository.Add(like);
            return Ok(new { message = "Liked" });
        }

        [Authorize]
        [HttpPost("Comment")]
        public async Task<IActionResult> AddComment(Guid ArticleId, string Comment, Guid? ParentCommentId)
        {

            if (ArticleId == Guid.Empty || Comment == null)
            {
                return BadRequest(new { message = " Error Occoured while performing task" });
            }
            var article = await articleUpload.GetArticleByID(ArticleId);

            if (article == null)
            {
                return NotFound(new { message = "Article doesnot exists" });
            }
            var newComment = await articleUpload.addComment(ArticleId, Comment, ParentCommentId);

            return Ok(newComment);

        }
        [Authorize]
        [HttpPost("ModifyComment")]
        public async Task<IActionResult> ModifyComment(Guid CommentId, string Comment)
        {

            if (CommentId == Guid.Empty || Comment == null)
            {
                return BadRequest(new { message = " Error Occoured while performing task" });
            }
            var article = await articleUpload.GetArticleByID(CommentId);

            if (article == null)
            {
                return NotFound(new { message = "Article doesnot exists" });
            }
            await articleUpload.ModifyComment(CommentId, Comment);

            return Ok(new { message = "comment added successfully" });

        }

        [Authorize]
        [HttpPost("ReportComment")]
        public async Task<IActionResult> ReportComment(Guid CommentId)
        {
            if (CommentId == Guid.Empty)
            {
                return BadRequest(new { message = " Error Occoured while performing task" });
            }
            var success = await articleUpload.ReportComment(CommentId);
            if (!success)
            {
                return BadRequest(new { message = "Already reported" });
            }
            return Ok(new { message = "Reported" });
        }

    }
}
