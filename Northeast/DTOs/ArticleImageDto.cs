namespace Northeast.DTOs
{
    public class ArticleImageDto
    {
        public List<byte[]>? Photo { get; set; }
        public string? PhotoLink { get; set; }
        public string? AltText { get; set; }
        public string? Caption { get; set; }
    }
}
