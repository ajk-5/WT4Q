using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Northeast.DTOs;
using Northeast.Models;
using Northeast.Services;
using Northeast.Repository;
using Northeast.Utilities;
using System.Linq;


namespace Northeast.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ArticleController : ControllerBase
    {
        private readonly ArticleServices articleUpload;
        private readonly LikeRepository _likeRepository;
        private readonly GetConnectedUser _connectedUser;
        private readonly IArticleRecommendationService _recommendations;
        private readonly CommentRepository _commentRepository;
        private readonly AiArticleWriterService _aiWriter;
        private readonly IAiWriteQueue _aiQueue;
        private readonly ArticleRepository _articleRepository;

        public ArticleController(
            ArticleServices _articleUpload,
            LikeRepository likeRepository,
            GetConnectedUser connectedUser,
            IArticleRecommendationService recommendations,
            CommentRepository commentRepository,
            AiArticleWriterService aiWriter,
            IAiWriteQueue aiQueue,
            ArticleRepository articleRepository)
        {
            articleUpload = _articleUpload;
            _likeRepository = likeRepository;
            _connectedUser = connectedUser;
            _recommendations = recommendations;
            _commentRepository = commentRepository;
            _aiWriter = aiWriter;
            _aiQueue = aiQueue;
            _articleRepository = articleRepository;
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
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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

        // Admin AI writer: queue a job to avoid gateway timeouts, then poll status
        [Authorize(Policy = "AdminOnly")]
        [HttpPost("ai-write")]
        public async Task<IActionResult> AiWrite([FromBody] AiWriteRequestDto req, CancellationToken ct)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Topic))
                return BadRequest(new { message = "Topic is required" });

            if (req.ArticleType == ArticleType.News)
                return BadRequest(new { message = "News generation is disabled for the 90s site." });

            if (req.UseRecentNews)
                return BadRequest(new { message = "Recent-source generation is disabled." });

            var authorId = _connectedUser.Id;
            if (authorId == Guid.Empty)
                return Unauthorized();

            try
            {
                var job = _aiQueue.Enqueue(authorId, req);
                // 202 Accepted with job id for polling
                return Accepted(new { jobId = job.Id });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal error while generating article", error = ex.Message });
            }
        }

        // Admin AI writer job status
        [Authorize(Policy = "AdminOnly")]
        [HttpGet("ai-write/jobs/{id:guid}")]
        public IActionResult AiWriteStatus([FromRoute] Guid id)
        {
            if (!_aiQueue.TryGet(id, out var job))
                return NotFound(new { message = "Job not found" });
            return Ok(new
            {
                id = job.Id,
                status = job.Status.ToString(),
                slug = job.Slug,
                error = job.Error
            });
        }

        [HttpGet("breaking")]
        public async Task<IActionResult> GetBreakingNews()
        {
            var articles = await articleUpload.GetBreakingNews();
            if (!articles.Any())
            {
                return NotFound(new { message = "No spotlight stories available" });
            }
            return Ok(articles);
        }

        [HttpGet("trending")]
        public async Task<IActionResult> GetTrending([FromQuery] int limit = 5)
        {
            var articles = await articleUpload.GetTrendingArticles(limit);
            if (!articles.Any())
            {
                return NotFound(new { message = "No trending stories available" });
            }
            return Ok(articles);
        }

        [HttpGet("{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return BadRequest(new { message = "Please enter a title" });
            }

            var article = await articleUpload.GetArticleBySlug(slug);
            if (article == null)
            {
                return NotFound(new { message = "Sorry, no article found with this title" });
            }
            if (article.ArticleType == ArticleType.News)
            {
                return NotFound(new { message = "Legacy news articles are disabled for the 90s site." });
            }

            return Ok(article);
        }

        [HttpGet("{slug}/recommendations")]
        public async Task<IActionResult> GetRecommendations(string slug, [FromQuery] int count = 5)
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return BadRequest(new { message = "Please enter a title" });
            }

            var article = await articleUpload.GetArticleBySlug(slug);
            if (article == null)
            {
                return NotFound(new { message = "Sorry, no article found with this title" });
            }

            var safeCount = Math.Clamp(count, 1, 12);
            IEnumerable<Article> results = Enumerable.Empty<Article>();

            try
            {
                results = await _recommendations.GetRecommendationsAsync(article.Id, safeCount);
            }
            catch
            {
                results = Enumerable.Empty<Article>();
            }

            if (!results.Any())
            {
                try
                {
                    results = await _articleRepository.GetRecentByCategoryExceptAsync(article.Category, article.Id, safeCount);
                }
                catch
                {
                    results = Enumerable.Empty<Article>();
                }
            }

            if (!results.Any())
            {
                try
                {
                    results = await _articleRepository.GetRecentExceptAsync(article.Id, safeCount);
                }
                catch
                {
                    results = Enumerable.Empty<Article>();
                }
            }

            var dto = results.Select(a => new ArticleRecommendationDto
            {
                Id = a.Id,
                Title = a.Title,

                Slug = a.Slug,

                Category = a.Category,
                ArticleType = a.ArticleType
            }).ToList();

            return Ok(dto);
        }

        [HttpGet("id/{id:guid}")]
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
            if (article.ArticleType == ArticleType.News)
            {
                return NotFound(new { message = "Legacy news articles are disabled for the 90s site." });
            }

            return Ok(article);
        }
        [Authorize(Policy = "AdminOnly")]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> EditArticle([FromRoute] Guid id, [FromBody] ArticleDto articleDto)
        {
            if (id == Guid.Empty)
            {
                return BadRequest(new { message = "Please enter an Id" });
            }

            if (articleDto == null)
            {
                return BadRequest(new { message = "Sorry, there is no ID" });
            }

            var existing = await articleUpload.GetArticleByID(id);
            if (existing == null)
            {
                return NotFound(new { message = "Sorry, there is no Articles with this ID" });
            }
            try
            {
                await articleUpload.ModifyArticle(id, articleDto);
                var updated = await articleUpload.GetArticleByID(id);
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal error while editing article", error = ex.Message });
            }
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
            var comment = await _commentRepository.GetByGUId(CommentId);
            if (comment == null)
            {
                return NotFound(new { message = "Comment does not exist" });
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
