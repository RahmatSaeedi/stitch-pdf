namespace PdfMerger.Client.Models;

public enum BatchOperationType
{
    Merge,
    Convert,
    Compress,
    Watermark,
    AddPageNumbers,
    PasswordProtect,
    Split,
    AddSignature
}

public enum BatchOperationStatus
{
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled
}

public class BatchOperation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public BatchOperationType Type { get; set; }
    public BatchOperationStatus Status { get; set; } = BatchOperationStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TotalItems { get; set; }
    public int ProcessedItems { get; set; }
    public int FailedItems { get; set; }
    public double Progress { get; set; }
    public string? ErrorMessage { get; set; }
    public List<BatchOperationItem> Items { get; set; } = new();
    public Dictionary<string, object> Settings { get; set; } = new();
}

public class BatchOperationItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public BatchOperationStatus Status { get; set; } = BatchOperationStatus.Pending;
    public string? ErrorMessage { get; set; }
    public byte[]? InputData { get; set; }
    public byte[]? OutputData { get; set; }
}

public class BatchOperationResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public byte[]? Data { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}
