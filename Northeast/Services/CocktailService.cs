using Northeast.DTOs;
using Northeast.Models;
using Northeast.Repository;
using Northeast.Utilities;
using System.Linq;

namespace Northeast.Services
{
    public class CocktailService
    {
        private readonly CocktailRepository _repository;

        public CocktailService(CocktailRepository repository)
        {
            _repository = repository;
        }

        public async Task Publish(CocktailDto dto)
        {
            var cocktail = new Cocktail
            {
                Name = dto.Name,
                Slug = HtmlText.Slug(dto.Name),
                Content = dto.Content,
                Ingridients = dto.Ingredients.Select(i => new Ingridient { Name = i.Name }).ToList(),
                IngredientQuantities = dto.Ingredients.Select(i => new IngridientQuantity
                {
                    Quantity = i.Quantity,
                    Ingridient = new Ingridient { Name = i.Name }
                }).ToList()
            };

            await _repository.Add(cocktail);
        }

        public async Task<IEnumerable<Cocktail>> GetAll() => await _repository.GetAll();

        public async Task<Cocktail> GetById(int id) => await _repository.GetById(id);

        public async Task<Cocktail?> GetBySlug(string slug) => await _repository.GetBySlug(slug);

        public async Task<IEnumerable<Cocktail>> Search(string query) => await _repository.Search(query);

        public async Task Update(int id, CocktailDto dto)
        {
            var cocktail = await _repository.GetById(id);
            if (cocktail == null) return;

            cocktail.Name = dto.Name;
            cocktail.Slug = HtmlText.Slug(dto.Name);
            cocktail.Content = dto.Content;
            cocktail.Ingridients = dto.Ingredients.Select(i => new Ingridient { Name = i.Name }).ToList();
            cocktail.IngredientQuantities = dto.Ingredients.Select(i => new IngridientQuantity
            {
                Quantity = i.Quantity,
                Ingridient = new Ingridient { Name = i.Name }
            }).ToList();

            await _repository.Update(cocktail);
        }

        public async Task Delete(int id)
        {
            var cocktail = await _repository.GetById(id);
            if (cocktail != null)
            {
                await _repository.Delete(cocktail);
            }
        }
    }
}
