namespace Northeast.DTOs
{
    public class CocktailIngredientDto
    {
        public string Name { get; set; }
        public string Quantity { get; set; }
    }

    public class CocktailDto
    {
        public string Name { get; set; }
        public string Content { get; set; }
        public List<CocktailIngredientDto> Ingredients { get; set; } = new();
    }
}
