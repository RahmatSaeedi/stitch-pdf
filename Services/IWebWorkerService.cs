namespace PdfMerger.Client.Services;

public interface IWebWorkerService
{
    Task<bool> InitializeAsync();
    Task<byte[]> MergePdfsAsync(List<(string name, byte[] data)> files, Dictionary<string, object>? options = null);
    Task<byte[]> CompressPdfAsync(byte[] pdfBytes, string quality = "medium");
    Task<byte[]> ExtractPagesAsync(byte[] pdfBytes, List<int> pageNumbers);
    Task<byte[]> RotatePageAsync(byte[] pdfBytes, int pageNumber, int degrees);
    Task<int> GetPageCountAsync(byte[] pdfBytes);
    Task<string> GenerateThumbnailAsync(byte[] pdfBytes, int pageIndex, double scale = 1.0);
    bool IsInitialized { get; }
    bool IsSupported { get; }
}
