using Microsoft.JSInterop;
using System.Text.Json;

namespace PdfMerger.Client.Services;

public interface IRecentFilesService
{
    Task<List<RecentFileEntry>> GetRecentFilesAsync();
    Task AddRecentFileAsync(string fileName, long fileSize, string contentType, int pageCount = 0);
    Task ClearHistoryAsync();
    Task RemoveRecentFileAsync(string fileName);
}

public class RecentFileEntry
{
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public int PageCount { get; set; }
    public DateTime AccessedAt { get; set; }
}

public class RecentFilesService : IRecentFilesService
{
    private readonly IJSRuntime _jsRuntime;
    private const string StorageKey = "pdfmerger_recent_files";
    private const int MaxRecentFiles = 10;

    public RecentFilesService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<List<RecentFileEntry>> GetRecentFilesAsync()
    {
        try
        {
            var json = await _jsRuntime.InvokeAsync<string?>("localStorage.getItem", StorageKey);
            if (string.IsNullOrEmpty(json))
            {
                return new List<RecentFileEntry>();
            }

            var entries = JsonSerializer.Deserialize<List<RecentFileEntry>>(json);
            return entries ?? new List<RecentFileEntry>();
        }
        catch
        {
            return new List<RecentFileEntry>();
        }
    }

    public async Task AddRecentFileAsync(string fileName, long fileSize, string contentType, int pageCount = 0)
    {
        try
        {
            var recentFiles = await GetRecentFilesAsync();

            // Remove existing entry with same filename if it exists
            recentFiles.RemoveAll(f => f.FileName.Equals(fileName, StringComparison.OrdinalIgnoreCase));

            // Add new entry at the top
            recentFiles.Insert(0, new RecentFileEntry
            {
                FileName = fileName,
                FileSize = fileSize,
                ContentType = contentType,
                PageCount = pageCount,
                AccessedAt = DateTime.UtcNow
            });

            // Keep only the most recent files
            if (recentFiles.Count > MaxRecentFiles)
            {
                recentFiles = recentFiles.Take(MaxRecentFiles).ToList();
            }

            // Save to localStorage
            var json = JsonSerializer.Serialize(recentFiles);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error saving recent file: {ex.Message}");
        }
    }

    public async Task ClearHistoryAsync()
    {
        try
        {
            await _jsRuntime.InvokeVoidAsync("localStorage.removeItem", StorageKey);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error clearing history: {ex.Message}");
        }
    }

    public async Task RemoveRecentFileAsync(string fileName)
    {
        try
        {
            var recentFiles = await GetRecentFilesAsync();
            recentFiles.RemoveAll(f => f.FileName.Equals(fileName, StringComparison.OrdinalIgnoreCase));

            var json = JsonSerializer.Serialize(recentFiles);
            await _jsRuntime.InvokeVoidAsync("localStorage.setItem", StorageKey, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error removing recent file: {ex.Message}");
        }
    }
}
