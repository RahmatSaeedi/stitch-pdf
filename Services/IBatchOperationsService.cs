using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface IBatchOperationsService
{
    event Action? OnBatchUpdated;

    Task<BatchOperation> CreateBatchOperationAsync(BatchOperationType type, string name, List<FileItem> files, Dictionary<string, object>? settings = null);
    Task<BatchOperationResult> ExecuteBatchOperationAsync(BatchOperation operation, IProgress<double>? progress = null);
    Task<BatchOperationResult> ExecuteBatchItemAsync(BatchOperation operation, BatchOperationItem item);
    Task CancelBatchOperationAsync(Guid operationId);

    List<BatchOperation> GetAllBatchOperations();
    List<BatchOperation> GetActiveBatchOperations();
    List<BatchOperation> GetCompletedBatchOperations(int limit = 10);
    BatchOperation? GetBatchOperation(Guid operationId);
    Task ClearCompletedBatchOperationsAsync();
}
