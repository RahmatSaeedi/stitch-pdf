using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface IFileValidationService
{
    FileValidationResult ValidateFile(string fileName, long fileSize, string contentType);
    FileValidationResult ValidateTotalSize(IEnumerable<FileItem> files);
    bool IsSupportedFileType(string contentType);
}
