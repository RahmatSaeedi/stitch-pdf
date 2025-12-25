using System.Text.Json;
using Microsoft.JSInterop;
using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public class TemplateService : ITemplateService
{
    private readonly IJSRuntime _jsRuntime;
    private List<Template> _templates = new();
    private const string StorageKey = "pdf_merger_templates";
    private bool _initialized;

    public event Action? OnTemplatesChanged;

    public TemplateService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    private async Task EnsureInitializedAsync()
    {
        if (_initialized) return;

        try
        {
            var json = await _jsRuntime.InvokeAsync<string>("localStorage.getItem", StorageKey);
            if (!string.IsNullOrEmpty(json))
            {
                _templates = JsonSerializer.Deserialize<List<Template>>(json) ?? new List<Template>();
            }
            else
            {
                // Load default templates on first run
                await LoadDefaultTemplatesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading templates: {ex.Message}");
            _templates = new List<Template>();
        }

        _initialized = true;
    }

    private async Task SaveTemplatesAsync()
    {
        try
        {
            var json = JsonSerializer.Serialize(_templates);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
            OnTemplatesChanged?.Invoke();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error saving templates: {ex.Message}");
        }
    }

    public async Task<List<Template>> GetAllTemplatesAsync()
    {
        await EnsureInitializedAsync();
        return _templates.OrderByDescending(t => t.IsFavorite)
                        .ThenByDescending(t => t.UsageCount)
                        .ThenByDescending(t => t.LastUsed)
                        .ToList();
    }

    public async Task<List<Template>> GetTemplatesByCategoryAsync(string category)
    {
        await EnsureInitializedAsync();
        return _templates
            .Where(t => t.Category == category)
            .OrderByDescending(t => t.IsFavorite)
            .ThenByDescending(t => t.UsageCount)
            .ToList();
    }

    public async Task<List<Template>> GetFavoriteTemplatesAsync()
    {
        await EnsureInitializedAsync();
        return _templates
            .Where(t => t.IsFavorite)
            .OrderByDescending(t => t.UsageCount)
            .ToList();
    }

    public async Task<Template?> GetTemplateAsync(Guid id)
    {
        await EnsureInitializedAsync();
        return _templates.FirstOrDefault(t => t.Id == id);
    }

    public async Task<Template> CreateTemplateAsync(
        string name,
        string description,
        TemplateType type,
        Dictionary<string, object> settings,
        string? category = null)
    {
        await EnsureInitializedAsync();

        var template = new Template
        {
            Name = name,
            Description = description,
            Type = type,
            Settings = settings,
            Category = category ?? "Custom"
        };

        _templates.Add(template);
        await SaveTemplatesAsync();

        return template;
    }

    public async Task UpdateTemplateAsync(Template template)
    {
        await EnsureInitializedAsync();

        var existing = _templates.FirstOrDefault(t => t.Id == template.Id);
        if (existing != null)
        {
            var index = _templates.IndexOf(existing);
            _templates[index] = template;
            await SaveTemplatesAsync();
        }
    }

    public async Task DeleteTemplateAsync(Guid id)
    {
        await EnsureInitializedAsync();

        var template = _templates.FirstOrDefault(t => t.Id == id);
        if (template != null)
        {
            _templates.Remove(template);
            await SaveTemplatesAsync();
        }
    }

    public async Task<bool> ApplyTemplateAsync(Guid id)
    {
        var template = await GetTemplateAsync(id);
        if (template == null) return false;

        // Update usage statistics
        template.LastUsed = DateTime.Now;
        template.UsageCount++;
        await UpdateTemplateAsync(template);

        return true;
    }

    public async Task ToggleFavoriteAsync(Guid id)
    {
        await EnsureInitializedAsync();

        var template = _templates.FirstOrDefault(t => t.Id == id);
        if (template != null)
        {
            template.IsFavorite = !template.IsFavorite;
            await SaveTemplatesAsync();
        }
    }

    public async Task IncrementUsageAsync(Guid id)
    {
        await EnsureInitializedAsync();

        var template = _templates.FirstOrDefault(t => t.Id == id);
        if (template != null)
        {
            template.UsageCount++;
            template.LastUsed = DateTime.Now;
            await SaveTemplatesAsync();
        }
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        await EnsureInitializedAsync();
        return _templates
            .Select(t => t.Category ?? "Uncategorized")
            .Distinct()
            .OrderBy(c => c)
            .ToList();
    }

    public async Task LoadDefaultTemplatesAsync()
    {
        // Don't call EnsureInitializedAsync here to avoid infinite recursion
        // This method is called from within EnsureInitializedAsync

        var defaultTemplates = DefaultTemplates.GetDefaultTemplates();
        foreach (var template in defaultTemplates)
        {
            // Only add if not already exists
            if (!_templates.Any(t => t.Name == template.Name))
            {
                _templates.Add(template);
            }
        }

        await SaveTemplatesAsync();
    }
}
