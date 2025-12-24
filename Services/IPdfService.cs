using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface IPdfService
{
    Task<ProcessingResult> MergeFilesAsync(List<FileItem> files, PdfConversionOptions? conversionSettings = null, IProgress<int>? progress = null);
    Task<string> GenerateThumbnailAsync(byte[] fileData, string contentType);
    Task<int> GetPageCountAsync(byte[] pdfData);
}
