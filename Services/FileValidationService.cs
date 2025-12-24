using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public class FileValidationService : IFileValidationService
{
    private const long MaxFileSizeBytes = 1L * 1024 * 1024 * 1024; // 1GB
    private const long MaxTotalSizeBytes = 4L * 1024 * 1024 * 1024; // 4GB

    private readonly HashSet<string> _supportedContentTypes = new()
    {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/x-ms-bmp",
        "image/svg+xml",
        "image/heic",
        "image/heif",
        "image/tiff",
        "image/avif",
        "text/plain",
        "text/markdown",
        "text/csv",
        "text/html",
        "text/xml",
        "application/xml",
        "application/json",
        "text/json",
        "application/epub+zip",
        "application/zip",
        "application/x-zip-compressed",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.oasis.opendocument.spreadsheet"
    };

    private readonly HashSet<string> _supportedExtensions = new()
    {
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".bmp",
        ".svg",
        ".heic",
        ".heif",
        ".tif",
        ".tiff",
        ".avif",
        ".txt",
        ".md",
        ".markdown",
        ".csv",
        ".html",
        ".htm",
        ".xml",
        ".json",
        ".epub",
        ".zip",
        ".docx",
        ".xlsx",
        ".xls",
        ".ods"
    };

    public FileValidationResult ValidateFile(string fileName, long fileSize, string contentType)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return FileValidationResult.Error("⚠️ Invalid file: File name is missing. Please try selecting a different file.");
        }

        if (fileSize <= 0)
        {
            return FileValidationResult.Error($"⚠️ Cannot process '{fileName}': File appears to be empty (0 bytes). Please check the file and try again.");
        }

        if (fileSize > MaxFileSizeBytes)
        {
            var maxSizeGB = MaxFileSizeBytes / (1024 * 1024 * 1024);
            var currentSizeGB = fileSize / (1024.0 * 1024.0 * 1024.0);
            return FileValidationResult.Error($"⚠️ File too large: '{fileName}' ({currentSizeGB:F2} GB) exceeds the maximum size limit of {maxSizeGB} GB. Try compressing the file or splitting it into smaller parts.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!_supportedExtensions.Contains(extension))
        {
            var supportedList = GetSupportedFileTypesFormatted();
            return FileValidationResult.Error($"⚠️ Unsupported file type: '{fileName}' has extension '{extension}' which is not supported.\n\n✅ Supported formats:\n{supportedList}");
        }

        if (!IsSupportedFileType(contentType))
        {
            // Extension already declared above, reuse it
            if (_supportedExtensions.Contains(extension))
            {
                // Extension is supported but content type doesn't match - likely browser detection issue
                return FileValidationResult.Error($"⚠️ File type mismatch: '{fileName}' has a valid extension ({extension}) but the browser detected content type '{contentType}'. This may indicate a corrupted file. Try re-saving or converting the file.");
            }
            return FileValidationResult.Error($"⚠️ Unsupported format: '{fileName}' has content type '{contentType}' which is not supported. Please convert to a supported format first.");
        }

        return FileValidationResult.Success();
    }

    private string GetSupportedFileTypesFormatted()
    {
        return @"• PDF Documents (.pdf)
• Images: PNG, JPG, WebP, GIF, BMP, SVG, HEIC, TIFF, AVIF
• Text Files: TXT, Markdown, CSV, HTML, XML, JSON
• Office Documents: DOCX, XLSX, XLS, ODS
• Archives: ZIP, EPUB";
    }

    public FileValidationResult ValidateTotalSize(IEnumerable<FileItem> files)
    {
        var totalSize = files.Sum(f => f.Size);

        if (totalSize > MaxTotalSizeBytes)
        {
            var maxSizeGB = MaxTotalSizeBytes / (1024.0 * 1024.0 * 1024.0);
            var currentSizeGB = totalSize / (1024.0 * 1024.0 * 1024.0);
            var fileCount = files.Count();

            return FileValidationResult.Error($"⚠️ Too much data: The total size of all {fileCount} files ({currentSizeGB:F2} GB) exceeds the maximum limit of {maxSizeGB:F1} GB.\n\n💡 Suggestions:\n• Process files in smaller batches\n• Remove some files from the list\n• Compress large files before uploading");
        }

        return FileValidationResult.Success();
    }

    public bool IsSupportedFileType(string contentType)
    {
        return _supportedContentTypes.Contains(contentType?.ToLowerInvariant() ?? string.Empty);
    }
}
