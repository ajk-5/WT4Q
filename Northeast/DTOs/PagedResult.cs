using System.Collections.Generic;

namespace Northeast.DTOs
{
    public class PagedResult<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int Total { get; set; }
        public int TotalPages => PageSize == 0 ? 0 : (int)System.Math.Ceiling((double)Total / PageSize);
        public List<T> Items { get; set; } = new();
    }
}

