using Microsoft.JSInterop;

namespace PdfMerger.Client.Services;

public class OcrService : IOcrService
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _module;
    private DotNetObjectReference<OcrService>? _dotNetRef;

    public OcrService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    private async Task<IJSObjectReference> GetModuleAsync()
    {
        _module ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/ocrInterop.js");
        return _module;
    }

    public async Task<bool> InitializeAsync(string language = "eng")
    {
        try
        {
            var module = await GetModuleAsync();
            var result = await module.InvokeAsync<bool>("initializeOCR", language);

            if (!result)
            {
                Console.WriteLine($"OCR initialization failed for language: {language}");
            }

            return result;
        }
        catch (JSException jsEx)
        {
            Console.WriteLine($"JavaScript error initializing OCR: {jsEx.Message}");
            Console.WriteLine($"Stack: {jsEx.StackTrace}");
            throw new Exception($"OCR initialization failed: {jsEx.Message}. Make sure you have an internet connection for first-time language download.", jsEx);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error initializing OCR: {ex.Message}");
            throw new Exception($"OCR initialization failed: {ex.Message}", ex);
        }
    }

    public async Task<OcrResult?> PerformOcrAsync(byte[] imageBytes, string language = "eng", IProgress<int>? progress = null)
    {
        try
        {
            var module = await GetModuleAsync();
            _dotNetRef = DotNetObjectReference.Create(this);

            var result = await module.InvokeAsync<OcrResult?>("performOCR", imageBytes, language, _dotNetRef);
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error performing OCR: {ex.Message}");
            return new OcrResult { Error = ex.Message };
        }
    }

    public async Task<PdfOcrResult?> PerformOcrOnPdfAsync(byte[] pdfBytes, string language = "eng", IProgress<PdfOcrProgress>? progress = null)
    {
        try
        {
            var module = await GetModuleAsync();
            _dotNetRef = DotNetObjectReference.Create(this);

            var result = await module.InvokeAsync<PdfOcrResult?>("performOCROnPDF", pdfBytes, language, _dotNetRef);
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error performing OCR on PDF: {ex.Message}");
            return new PdfOcrResult { Success = false, Error = ex.Message };
        }
    }

    public async Task<byte[]?> MakePdfSearchableAsync(byte[] pdfBytes, PdfOcrResult ocrResults)
    {
        try
        {
            var module = await GetModuleAsync();
            return await module.InvokeAsync<byte[]?>("makePDFSearchable", pdfBytes, ocrResults);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error making PDF searchable: {ex.Message}");
            return null;
        }
    }

    public async Task<List<OcrLanguage>> GetSupportedLanguagesAsync()
    {
        try
        {
            var module = await GetModuleAsync();
            var result = await module.InvokeAsync<List<OcrLanguage>>("getSupportedLanguages");
            return result ?? new List<OcrLanguage>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting supported languages: {ex.Message}");
            return new List<OcrLanguage>();
        }
    }

    [JSInvokable]
    public void OnOCRProgress(int percentage)
    {
        // Progress callback from JavaScript
        Console.WriteLine($"OCR Progress: {percentage}%");
    }

    [JSInvokable]
    public void OnPDFOCRProgress(int currentPage, int totalPages)
    {
        // Progress callback for PDF OCR
        Console.WriteLine($"OCR Progress: Page {currentPage} of {totalPages}");
    }

    public async Task DisposeAsync()
    {
        if (_module != null)
        {
            try
            {
                await _module.InvokeVoidAsync("disposeOCR");
                await _module.DisposeAsync();
            }
            catch { }
        }

        _dotNetRef?.Dispose();
    }
}
