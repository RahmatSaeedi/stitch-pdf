using Microsoft.JSInterop;
using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public class PdfService : IPdfService, IAsyncDisposable
{
    private readonly Lazy<Task<IJSObjectReference>> _moduleTask;
    private readonly IFileValidationService _validationService;

    public PdfService(IJSRuntime jsRuntime, IFileValidationService validationService)
    {
        _validationService = validationService;
        _moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>(
            "import", "./js/pdfInterop.js").AsTask());
    }

    public async Task<ProcessingResult> MergeFilesAsync(List<FileItem> files, PdfConversionOptions? conversionSettings = null, IProgress<int>? progress = null)
    {
        try
        {
            if (files == null || files.Count < 1)
            {
                return ProcessingResult.Failure("At least 1 file is required");
            }

            // Validate total size
            var validation = _validationService.ValidateTotalSize(files);
            if (!validation.IsValid)
            {
                return ProcessingResult.Failure(validation.ErrorMessage ?? "Validation failed");
            }

            // Prepare file data for JavaScript
            var filesData = files.OrderBy(f => f.Order).Select(f => new
            {
                bytes = f.Data,
                type = f.ContentType,
                selectedPages = f.SelectedPages,
                pageRotations = f.PageRotations,
                rotation = f.Rotation,
                conversionOverrides = f.ConversionOverrides
            }).ToArray();

            // Get JavaScript module
            var module = await _moduleTask.Value;

            // Create progress reporter if progress callback is provided
            DotNetObjectReference<ProgressReporter>? progressRef = null;
            if (progress != null)
            {
                progressRef = DotNetObjectReference.Create(new ProgressReporter(progress));
            }

            try
            {
                // Call JavaScript merge function - returns Uint8Array as byte[] directly
                var resultBytes = await module.InvokeAsync<byte[]>(
                    "mergePdfs",
                    filesData,
                    progressRef,
                    conversionSettings);

                return ProcessingResult.SuccessResult(resultBytes);
            }
            finally
            {
                progressRef?.Dispose();
            }
        }
        catch (JSException jsEx)
        {
            return ProcessingResult.Failure($"PDF processing error: {jsEx.Message}");
        }
        catch (Exception ex)
        {
            return ProcessingResult.Failure($"Merge failed: {ex.Message}");
        }
    }

    public async Task<string> GenerateThumbnailAsync(byte[] fileData, string contentType)
    {
        try
        {
            var module = await _moduleTask.Value;

            if (contentType == "application/pdf")
            {
                return await module.InvokeAsync<string>("generatePdfThumbnail", fileData);
            }
            else if (contentType == "image/tiff")
            {
                return await module.InvokeAsync<string>("generateTiffThumbnail", fileData);
            }
            else if (contentType == "image/avif")
            {
                return await module.InvokeAsync<string>("generateAvifThumbnail", fileData);
            }
            else if (contentType.StartsWith("image/"))
            {
                return await module.InvokeAsync<string>(
                    "generateImageThumbnail",
                    fileData,
                    contentType);
            }
            else if (contentType == "text/plain")
            {
                return await module.InvokeAsync<string>("generateTextThumbnail", fileData);
            }
            else if (contentType == "text/markdown")
            {
                return await module.InvokeAsync<string>("generateMarkdownThumbnail", fileData);
            }
            else if (contentType == "text/csv")
            {
                return await module.InvokeAsync<string>("generateCsvThumbnail", fileData);
            }
            else if (contentType == "text/html")
            {
                return await module.InvokeAsync<string>("generateHtmlThumbnail", fileData);
            }
            else if (contentType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            {
                return await module.InvokeAsync<string>("generateDocxThumbnail", fileData);
            }
            else if (contentType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            {
                return await module.InvokeAsync<string>("generateXlsxThumbnail", fileData);
            }
            else if (contentType == "application/vnd.ms-excel")
            {
                return await module.InvokeAsync<string>("generateXlsxThumbnail", fileData);
            }
            else if (contentType == "application/vnd.oasis.opendocument.spreadsheet")
            {
                return await module.InvokeAsync<string>("generateXlsxThumbnail", fileData);
            }
            else if (contentType == "text/xml" || contentType == "application/xml")
            {
                return await module.InvokeAsync<string>("generateXmlThumbnail", fileData);
            }
            else if (contentType == "application/json" || contentType == "text/json")
            {
                return await module.InvokeAsync<string>("generateJsonThumbnail", fileData);
            }
            else if (contentType == "application/epub+zip")
            {
                return await module.InvokeAsync<string>("generateEpubThumbnail", fileData);
            }

            // Return default icon for unsupported types
            return GetDefaultIcon(contentType);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to generate thumbnail: {ex.Message}");
            // Return default icon on error
            return GetDefaultIcon(contentType);
        }
    }

    public async Task<int> GetPageCountAsync(byte[] pdfData)
    {
        try
        {
            var module = await _moduleTask.Value;
            return await module.InvokeAsync<int>("getPageCount", pdfData);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to get page count: {ex.Message}");
            return 0;
        }
    }

    private string GetDefaultIcon(string contentType)
    {
        var isPdf = contentType == "application/pdf";
        var color = isPdf ? "#dc3545" : "#17a2b8";
        var text = isPdf ? "PDF" : "IMG";

        return $"data:image/svg+xml," + Uri.EscapeDataString($@"
            <svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='none' stroke='{color}' stroke-width='2'>
                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'></path>
                <polyline points='14 2 14 8 20 8'></polyline>
                <text x='50%' y='60%' text-anchor='middle' font-size='6' fill='{color}' font-family='Arial, sans-serif'>{text}</text>
            </svg>
        ");
    }

    public async ValueTask DisposeAsync()
    {
        if (_moduleTask.IsValueCreated)
        {
            var module = await _moduleTask.Value;
            await module.DisposeAsync();
        }
    }

    private class ProgressReporter
    {
        private readonly IProgress<int> _progress;

        public ProgressReporter(IProgress<int> progress)
        {
            _progress = progress;
        }

        [JSInvokable]
        public void ReportProgress(int percentage)
        {
            _progress.Report(percentage);
        }
    }
}
