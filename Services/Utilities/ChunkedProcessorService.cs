namespace PdfMerger.Client.Services.Utilities;

/// <summary>
/// Service for processing large collections in memory-efficient chunks
/// </summary>
public class ChunkedProcessorService : IChunkedProcessorService
{
    private readonly IMemoryMonitorService _memoryMonitor;

    public ChunkedProcessorService(IMemoryMonitorService memoryMonitor)
    {
        _memoryMonitor = memoryMonitor;
    }

    public async Task<List<TResult>> ProcessInChunksAsync<TItem, TResult>(
        IEnumerable<TItem> items,
        Func<TItem, Task<TResult>> processor,
        int chunkSize = 5,
        IProgress<ChunkedProgressInfo>? progress = null)
    {
        var itemList = items.ToList();
        var results = new List<TResult>(itemList.Count);
        var totalItems = itemList.Count;
        var chunks = (int)Math.Ceiling(totalItems / (double)chunkSize);

        for (int chunkIndex = 0; chunkIndex < chunks; chunkIndex++)
        {
            var chunkItems = itemList
                .Skip(chunkIndex * chunkSize)
                .Take(chunkSize)
                .ToList();

            // Process items in this chunk
            for (int itemIndex = 0; itemIndex < chunkItems.Count; itemIndex++)
            {
                var overallIndex = (chunkIndex * chunkSize) + itemIndex;
                var percentage = (int)((overallIndex + 1) / (double)totalItems * 100);

                // Get memory info
                var memInfo = await _memoryMonitor.GetMemoryInfoAsync();

                // Report progress
                progress?.Report(new ChunkedProgressInfo
                {
                    Percentage = percentage,
                    CurrentChunk = chunkIndex + 1,
                    TotalChunks = chunks,
                    CurrentItem = overallIndex + 1,
                    TotalItems = totalItems,
                    MemoryUsedBytes = memInfo.UsedMemory,
                    StatusMessage = $"Processing chunk {chunkIndex + 1} of {chunks}"
                });

                // Process the item
                var result = await processor(chunkItems[itemIndex]);
                results.Add(result);

                // Yield to UI to keep responsive
                await Task.Delay(1);
            }

            // After each chunk, force cleanup if memory is getting high
            var postChunkMemory = await _memoryMonitor.GetMemoryInfoAsync();
            if (postChunkMemory.UsedPercent > 70)
            {
                _memoryMonitor.ForceCleanup();
                // Give GC time to work
                await Task.Delay(100);
            }

            // Yield between chunks
            await Task.Delay(10);
        }

        return results;
    }

    public async Task ProcessInChunksAsync<TItem>(
        IEnumerable<TItem> items,
        Func<TItem, Task> processor,
        int chunkSize = 5,
        IProgress<ChunkedProgressInfo>? progress = null)
    {
        await ProcessInChunksAsync(
            items,
            async item =>
            {
                await processor(item);
                return true; // Dummy return value
            },
            chunkSize,
            progress
        );
    }
}
