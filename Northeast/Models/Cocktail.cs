using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Northeast.Models
{
    public class Cocktail
    {
        public int Id { get; set; }

        public string Name { get; set; }
        public string description { get; set; }

        public List<Ingridient> Ingridients { get; set; } = new List<Ingridient>();

        public List<IngridientQuantity> IngredientQuantities { get; set; } = new List<IngridientQuantity>();
    }

    public class Ingridient { 
        public int Id { get; set; }
        public string Name { get; set; }
    }
    public class IngridientQuantity
    {
        [Key]
        public int Id { get; set; }


        public string Quantity { get; set; }

        public Ingridient Ingridient { get; set; }

        [ForeignKey(nameof(Ingridient))]
        public int IngridientID { get; set; }

        public Cocktail Cocktail { get; set; }

        [ForeignKey(nameof(Cocktail))]
        public int CocktailID { get; set;}
    }
}
