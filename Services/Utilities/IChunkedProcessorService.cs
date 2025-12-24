namespace PdfMerger.Client.Services.Utilities;

/// <summary>
/// Service for processing large collections of items in chunks to prevent memory issues
/// </summary>
public interface IChunkedProcessorService
{
    /// <summary>
    /// Processes items in chunks with memory management and progress reporting
    /// </summary>
    /// <typeparam name="TItem">Type of item to process</typeparam>
    /// <typeparam name="TResult">Type of result from processing</typeparam>
    /// <param name="items">Items to process</param>
    /// <param name="processor">Function to process each item</param>
    /// <param name="chunkSize">Number of items per chunk (default: 5)</param>
    /// <param name="progress">Progress reporter (0-100)</param>
    /// <returns>List of results from processing</returns>
    Task<List<TResult>> ProcessInChunksAsync<TItem, TResult>(
        IEnumerable<TItem> items,
        Func<TItem, Task<TResult>> processor,
        int chunkSize = 5,
        IProgress<ChunkedProgressInfo>? progress = null
    );

    /// <summary>
    /// Processes items in chunks and returns when all are complete
    /// </summary>
    /// <typeparam name="TItem">Type of item to process</typeparam>
    /// <param name="items">Items to process</param>
    /// <param name="processor">Action to perform on each item</param>
    /// <param name="chunkSize">Number of items per chunk (default: 5)</param>
    /// <param name="progress">Progress reporter</param>
    Task ProcessInChunksAsync<TItem>(
        IEnumerable<TItem> items,
        Func<TItem, Task> processor,
        int chunkSize = 5,
        IProgress<ChunkedProgressInfo>? progress = null
    );
}

/// <summary>
/// Progress information for chunked processing
/// </summary>
public class ChunkedProgressInfo
{
    /// <summary>
    /// Overall progress percentage (0-100)
    /// </summary>
    public int Percentage { get; set; }

    /// <summary>
    /// Current chunk being processed
    /// </summary>
    public int CurrentChunk { get; set; }

    /// <summary>
    /// Total number of chunks
    /// </summary>
    public int TotalChunks { get; set; }

    /// <summary>
    /// Current item within chunk
    /// </summary>
    public int CurrentItem { get; set; }

    /// <summary>
    /// Total items being processed
    /// </summary>
    public int TotalItems { get; set; }

    /// <summary>
    /// Current memory usage (if available)
    /// </summary>
    public long? MemoryUsedBytes { get; set; }

    /// <summary>
    /// Status message
    /// </summary>
    public string? StatusMessage { get; set; }
}
