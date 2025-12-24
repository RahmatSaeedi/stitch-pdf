namespace PdfMerger.Client.Services.Utilities;

/// <summary>
/// Service for monitoring browser memory usage and preventing crashes
/// </summary>
public interface IMemoryMonitorService
{
    /// <summary>
    /// Gets current memory usage information
    /// </summary>
    Task<MemoryInfo> GetMemoryInfoAsync();

    /// <summary>
    /// Checks if there's enough memory to process a file of given size
    /// </summary>
    Task<bool> CanProcessFileAsync(long fileSize);

    /// <summary>
    /// Forces garbage collection to free memory
    /// </summary>
    void ForceCleanup();
}

/// <summary>
/// Memory usage information from the browser
/// </summary>
public class MemoryInfo
{
    /// <summary>
    /// Total memory limit (in bytes)
    /// </summary>
    public long TotalMemory { get; set; }

    /// <summary>
    /// Currently used memory (in bytes)
    /// </summary>
    public long UsedMemory { get; set; }

    /// <summary>
    /// Available memory (in bytes)
    /// </summary>
    public long AvailableMemory => TotalMemory - UsedMemory;

    /// <summary>
    /// Percentage of memory used (0-100)
    /// </summary>
    public double UsedPercent => TotalMemory > 0 ? (UsedMemory / (double)TotalMemory) * 100 : 0;

    /// <summary>
    /// Whether memory usage is in warning zone (>70%)
    /// </summary>
    public bool IsWarning => UsedPercent > 70;

    /// <summary>
    /// Whether memory usage is critical (>85%)
    /// </summary>
    public bool IsCritical => UsedPercent > 85;
}
