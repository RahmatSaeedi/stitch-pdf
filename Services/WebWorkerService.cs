using Microsoft.JSInterop;
using System.Collections.Concurrent;

namespace PdfMerger.Client.Services;

public class WebWorkerService : IWebWorkerService, IAsyncDisposable
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _workerModule;
    private readonly ConcurrentDictionary<string, TaskCompletionSource<object>> _pendingTasks = new();
    private int _taskIdCounter;
    private bool _initialized;
    private bool _isSupported = true;

    public bool IsInitialized => _initialized;
    public bool IsSupported => _isSupported;

    public WebWorkerService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<bool> InitializeAsync()
    {
        if (_initialized) return true;

        try
        {
            // Check if Web Workers are supported
            _isSupported = await _jsRuntime.InvokeAsync<bool>("eval",
                "typeof(Worker) !== 'undefined'");

            if (!_isSupported)
            {
                Console.WriteLine("Web Workers not supported in this browser");
                return false;
            }

            _workerModule = await _jsRuntime.InvokeAsync<IJSObjectReference>(
                "import", "./js/webWorkerBridge.js");

            var libPaths = new
            {
                pdfLib = "/lib/pdf-lib.min.js",
                pdfjsLib = "/lib/pdf.min.js",
                pdfjsWorker = "/lib/pdf.worker.min.js"
            };

            _initialized = await _workerModule.InvokeAsync<bool>(
                "initializeWorker", DotNetObjectReference.Create(this), libPaths);

            if (_initialized)
            {
                Console.WriteLine("Web Worker initialized successfully");
            }

            return _initialized;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error initializing Web Worker: {ex.Message}");
            _isSupported = false;
            return false;
        }
    }

    public async Task<byte[]> MergePdfsAsync(List<(string name, byte[] data)> files, Dictionary<string, object>? options = null)
    {
        await EnsureInitializedAsync();

        var fileData = files.Select(f => new { name = f.name, data = f.data }).ToList();
        var result = await SendTaskAsync<byte[]>("mergePdfs", new { files = fileData, options });
        return result;
    }

    public async Task<byte[]> CompressPdfAsync(byte[] pdfBytes, string quality = "medium")
    {
        await EnsureInitializedAsync();
        return await SendTaskAsync<byte[]>("compressPdf", new { pdfBytes, quality });
    }

    public async Task<byte[]> ExtractPagesAsync(byte[] pdfBytes, List<int> pageNumbers)
    {
        await EnsureInitializedAsync();
        return await SendTaskAsync<byte[]>("extractPages", new { pdfBytes, pageNumbers });
    }

    public async Task<byte[]> RotatePageAsync(byte[] pdfBytes, int pageNumber, int degrees)
    {
        await EnsureInitializedAsync();
        return await SendTaskAsync<byte[]>("rotatePage", new { pdfBytes, pageNumber, degrees });
    }

    public async Task<int> GetPageCountAsync(byte[] pdfBytes)
    {
        await EnsureInitializedAsync();
        return await SendTaskAsync<int>("getPageCount", new { pdfBytes });
    }

    public async Task<string> GenerateThumbnailAsync(byte[] pdfBytes, int pageIndex, double scale = 1.0)
    {
        await EnsureInitializedAsync();
        var thumbnailBytes = await SendTaskAsync<byte[]>("generateThumbnail", new { pdfBytes, pageIndex, scale });

        // Convert to data URL
        var base64 = Convert.ToBase64String(thumbnailBytes);
        return $"data:image/png;base64,{base64}";
    }

    private async Task EnsureInitializedAsync()
    {
        if (!_initialized)
        {
            var success = await InitializeAsync();
            if (!success)
            {
                throw new InvalidOperationException("Web Worker could not be initialized");
            }
        }
    }

    private async Task<T> SendTaskAsync<T>(string type, object data)
    {
        if (_workerModule == null)
        {
            throw new InvalidOperationException("Worker module not initialized");
        }

        var taskId = Interlocked.Increment(ref _taskIdCounter).ToString();
        var tcs = new TaskCompletionSource<object>();
        _pendingTasks[taskId] = tcs;

        try
        {
            await _workerModule.InvokeVoidAsync("postTask", type, taskId, data);

            // Wait for result with timeout
            var timeoutTask = Task.Delay(TimeSpan.FromMinutes(5));
            var completedTask = await Task.WhenAny(tcs.Task, timeoutTask);

            if (completedTask == timeoutTask)
            {
                _pendingTasks.TryRemove(taskId, out _);
                throw new TimeoutException($"Worker task '{type}' timed out after 5 minutes");
            }

            var result = await tcs.Task;
            return (T)result;
        }
        catch
        {
            _pendingTasks.TryRemove(taskId, out _);
            throw;
        }
    }

    [JSInvokable]
    public void OnWorkerMessage(string type, string id, bool success, object? result, string? error)
    {
        if (!_pendingTasks.TryRemove(id, out var tcs))
        {
            return;
        }

        if (success && result != null)
        {
            tcs.SetResult(result);
        }
        else
        {
            tcs.SetException(new Exception(error ?? "Worker task failed"));
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_workerModule != null)
        {
            try
            {
                await _workerModule.InvokeVoidAsync("terminateWorker");
                await _workerModule.DisposeAsync();
            }
            catch { }
        }

        _pendingTasks.Clear();
    }
}
