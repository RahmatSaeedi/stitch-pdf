using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public class BatchOperationsService : IBatchOperationsService
{
    private readonly IPdfService _pdfService;
    private readonly IAdvancedPdfService _advancedPdfService;
    private readonly ISignatureService _signatureService;
    private readonly List<BatchOperation> _batchOperations = new();
    private readonly Dictionary<Guid, CancellationTokenSource> _cancellationTokens = new();

    public event Action? OnBatchUpdated;

    public BatchOperationsService(
        IPdfService pdfService,
        IAdvancedPdfService advancedPdfService,
        ISignatureService signatureService)
    {
        _pdfService = pdfService;
        _advancedPdfService = advancedPdfService;
        _signatureService = signatureService;
    }

    public Task<BatchOperation> CreateBatchOperationAsync(
        BatchOperationType type,
        string name,
        List<FileItem> files,
        Dictionary<string, object>? settings = null)
    {
        var operation = new BatchOperation
        {
            Name = name,
            Type = type,
            TotalItems = files.Count,
            Settings = settings ?? new Dictionary<string, object>(),
            Items = files.Select(f => new BatchOperationItem
            {
                FileName = f.Name,
                FileSize = f.Size,
                InputData = f.Data
            }).ToList()
        };

        _batchOperations.Add(operation);
        OnBatchUpdated?.Invoke();

        return Task.FromResult(operation);
    }

    public async Task<BatchOperationResult> ExecuteBatchOperationAsync(
        BatchOperation operation,
        IProgress<double>? progress = null)
    {
        operation.Status = BatchOperationStatus.Processing;
        operation.StartedAt = DateTime.Now;
        operation.ProcessedItems = 0;
        operation.FailedItems = 0;

        var cts = new CancellationTokenSource();
        _cancellationTokens[operation.Id] = cts;

        OnBatchUpdated?.Invoke();

        try
        {
            var totalItems = operation.Items.Count;
            var processedCount = 0;

            foreach (var item in operation.Items)
            {
                if (cts.Token.IsCancellationRequested)
                {
                    operation.Status = BatchOperationStatus.Cancelled;
                    operation.ErrorMessage = "Operation cancelled by user";
                    OnBatchUpdated?.Invoke();
                    return new BatchOperationResult
                    {
                        Success = false,
                        ErrorMessage = "Operation cancelled"
                    };
                }

                try
                {
                    item.Status = BatchOperationStatus.Processing;
                    OnBatchUpdated?.Invoke();

                    var result = await ExecuteBatchItemAsync(operation, item);

                    if (result.Success && result.Data != null)
                    {
                        item.OutputData = result.Data;
                        item.Status = BatchOperationStatus.Completed;
                        operation.ProcessedItems++;
                    }
                    else
                    {
                        item.Status = BatchOperationStatus.Failed;
                        item.ErrorMessage = result.ErrorMessage ?? "Unknown error";
                        operation.FailedItems++;
                    }
                }
                catch (Exception ex)
                {
                    item.Status = BatchOperationStatus.Failed;
                    item.ErrorMessage = ex.Message;
                    operation.FailedItems++;
                }

                processedCount++;
                operation.Progress = (processedCount / (double)totalItems) * 100;
                progress?.Report(operation.Progress);
                OnBatchUpdated?.Invoke();

                // Small delay to prevent overwhelming the UI
                await Task.Delay(10);
            }

            operation.Status = operation.FailedItems == 0
                ? BatchOperationStatus.Completed
                : operation.ProcessedItems > 0
                    ? BatchOperationStatus.Completed
                    : BatchOperationStatus.Failed;

            operation.CompletedAt = DateTime.Now;
            OnBatchUpdated?.Invoke();

            return new BatchOperationResult
            {
                Success = operation.Status == BatchOperationStatus.Completed,
                ErrorMessage = operation.ErrorMessage
            };
        }
        catch (Exception ex)
        {
            operation.Status = BatchOperationStatus.Failed;
            operation.ErrorMessage = ex.Message;
            operation.CompletedAt = DateTime.Now;
            OnBatchUpdated?.Invoke();

            return new BatchOperationResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
        finally
        {
            _cancellationTokens.Remove(operation.Id);
        }
    }

    public async Task<BatchOperationResult> ExecuteBatchItemAsync(BatchOperation operation, BatchOperationItem item)
    {
        if (item.InputData == null)
        {
            return new BatchOperationResult
            {
                Success = false,
                ErrorMessage = "No input data"
            };
        }

        try
        {
            byte[]? outputData = null;

            switch (operation.Type)
            {
                case BatchOperationType.Compress:
                    var quality = operation.Settings.ContainsKey("Quality")
                        ? operation.Settings["Quality"].ToString()
                        : "medium";
                    outputData = await _advancedPdfService.CompressPdfAsync(item.InputData, quality ?? "medium");
                    break;

                case BatchOperationType.Watermark:
                    var watermarkText = operation.Settings.ContainsKey("WatermarkText")
                        ? operation.Settings["WatermarkText"].ToString()
                        : "WATERMARK";
                    var watermarkOptions = new WatermarkOptions
                    {
                        Opacity = operation.Settings.ContainsKey("Opacity")
                            ? Convert.ToSingle(operation.Settings["Opacity"])
                            : 0.3f
                    };
                    outputData = await _advancedPdfService.AddWatermarkAsync(
                        item.InputData,
                        watermarkText ?? "WATERMARK",
                        watermarkOptions
                    );
                    break;

                case BatchOperationType.AddPageNumbers:
                    var position = operation.Settings.ContainsKey("Position")
                        ? operation.Settings["Position"].ToString()
                        : "bottom-center";
                    var pageNumberOptions = new PageNumberOptions
                    {
                        Position = position ?? "bottom-center"
                    };
                    outputData = await _advancedPdfService.AddPageNumbersAsync(
                        item.InputData,
                        pageNumberOptions
                    );
                    break;

                case BatchOperationType.PasswordProtect:
                    var password = operation.Settings.ContainsKey("Password")
                        ? operation.Settings["Password"].ToString()
                        : "";
                    if (!string.IsNullOrEmpty(password))
                    {
                        outputData = await _advancedPdfService.ProtectPdfAsync(item.InputData, password);
                    }
                    else
                    {
                        return new BatchOperationResult
                        {
                            Success = false,
                            ErrorMessage = "Password required"
                        };
                    }
                    break;

                case BatchOperationType.Convert:
                    // For now, conversion is handled by the main merge pipeline
                    outputData = item.InputData;
                    break;

                case BatchOperationType.Merge:
                    // Merge operations are handled differently - they combine multiple items
                    outputData = item.InputData;
                    break;

                case BatchOperationType.Split:
                case BatchOperationType.AddSignature:
                    // These require additional parameters - implement as needed
                    outputData = item.InputData;
                    break;

                default:
                    return new BatchOperationResult
                    {
                        Success = false,
                        ErrorMessage = $"Unsupported operation type: {operation.Type}"
                    };
            }

            return new BatchOperationResult
            {
                Success = outputData != null,
                Data = outputData,
                ErrorMessage = outputData == null ? "Operation failed" : null
            };
        }
        catch (Exception ex)
        {
            return new BatchOperationResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public Task CancelBatchOperationAsync(Guid operationId)
    {
        if (_cancellationTokens.TryGetValue(operationId, out var cts))
        {
            cts.Cancel();
        }

        var operation = GetBatchOperation(operationId);
        if (operation != null)
        {
            operation.Status = BatchOperationStatus.Cancelled;
            operation.CompletedAt = DateTime.Now;
            OnBatchUpdated?.Invoke();
        }

        return Task.CompletedTask;
    }

    public List<BatchOperation> GetAllBatchOperations()
    {
        return _batchOperations.OrderByDescending(b => b.CreatedAt).ToList();
    }

    public List<BatchOperation> GetActiveBatchOperations()
    {
        return _batchOperations
            .Where(b => b.Status == BatchOperationStatus.Pending || b.Status == BatchOperationStatus.Processing)
            .OrderByDescending(b => b.CreatedAt)
            .ToList();
    }

    public List<BatchOperation> GetCompletedBatchOperations(int limit = 10)
    {
        return _batchOperations
            .Where(b => b.Status == BatchOperationStatus.Completed ||
                       b.Status == BatchOperationStatus.Failed ||
                       b.Status == BatchOperationStatus.Cancelled)
            .OrderByDescending(b => b.CompletedAt)
            .Take(limit)
            .ToList();
    }

    public BatchOperation? GetBatchOperation(Guid operationId)
    {
        return _batchOperations.FirstOrDefault(b => b.Id == operationId);
    }

    public Task ClearCompletedBatchOperationsAsync()
    {
        _batchOperations.RemoveAll(b =>
            b.Status == BatchOperationStatus.Completed ||
            b.Status == BatchOperationStatus.Failed ||
            b.Status == BatchOperationStatus.Cancelled);

        OnBatchUpdated?.Invoke();
        return Task.CompletedTask;
    }
}
