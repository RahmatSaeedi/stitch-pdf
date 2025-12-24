using Microsoft.JSInterop;

namespace PdfMerger.Client.Services.Utilities;

/// <summary>
/// Service for monitoring browser memory usage via JavaScript Performance API
/// </summary>
public class MemoryMonitorService : IMemoryMonitorService
{
    private readonly IJSRuntime _jsRuntime;

    public MemoryMonitorService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<MemoryInfo> GetMemoryInfoAsync()
    {
        try
        {
            // Try to get memory info from browser's Performance API
            var memoryData = await _jsRuntime.InvokeAsync<MemoryData>("eval",
                @"(function() {
                    if (performance.memory) {
                        return {
                            totalJSHeapSize: performance.memory.totalJSHeapSize,
                            usedJSHeapSize: performance.memory.usedJSHeapSize,
                            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                        };
                    }
                    // Fallback: estimate based on typical browser limits
                    return {
                        totalJSHeapSize: 2147483648, // 2GB estimate
                        usedJSHeapSize: 536870912,   // 512MB estimate
                        jsHeapSizeLimit: 2147483648
                    };
                })()");

            return new MemoryInfo
            {
                TotalMemory = memoryData.JsHeapSizeLimit,
                UsedMemory = memoryData.UsedJSHeapSize
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting memory info: {ex.Message}");

            // Return safe defaults if memory API is not available
            return new MemoryInfo
            {
                TotalMemory = 2147483648, // 2GB
                UsedMemory = 536870912    // 512MB
            };
        }
    }

    public async Task<bool> CanProcessFileAsync(long fileSize)
    {
        var memInfo = await GetMemoryInfoAsync();

        // Estimate that we need 3x the file size for processing
        // (original + conversion + output)
        var estimatedMemoryNeeded = fileSize * 3;

        // Check if we have enough available memory (with 20% safety margin)
        var availableMemory = memInfo.AvailableMemory * 0.8;

        return estimatedMemoryNeeded < availableMemory;
    }

    public void ForceCleanup()
    {
        // Force .NET garbage collection
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
    }

    private class MemoryData
    {
        public long TotalJSHeapSize { get; set; }
        public long UsedJSHeapSize { get; set; }
        public long JsHeapSizeLimit { get; set; }
    }
}
