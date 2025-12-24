using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface ITemplateService
{
    event Action? OnTemplatesChanged;

    Task<List<Template>> GetAllTemplatesAsync();
    Task<List<Template>> GetTemplatesByCategoryAsync(string category);
    Task<List<Template>> GetFavoriteTemplatesAsync();
    Task<Template?> GetTemplateAsync(Guid id);
    Task<Template> CreateTemplateAsync(string name, string description, TemplateType type, Dictionary<string, object> settings, string? category = null);
    Task UpdateTemplateAsync(Template template);
    Task DeleteTemplateAsync(Guid id);
    Task<bool> ApplyTemplateAsync(Guid id);
    Task ToggleFavoriteAsync(Guid id);
    Task IncrementUsageAsync(Guid id);
    Task<List<string>> GetCategoriesAsync();
    Task LoadDefaultTemplatesAsync();
}
