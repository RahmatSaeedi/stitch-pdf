using Microsoft.JSInterop;

namespace PdfMerger.Client.Services;

public class AdvancedPdfService : IAdvancedPdfService
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _advancedModule;
    private IJSObjectReference? _qrBarcodeModule;

    public AdvancedPdfService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    private async Task<IJSObjectReference> GetAdvancedModuleAsync()
    {
        _advancedModule ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/pdfAdvancedInterop.js");
        return _advancedModule;
    }

    private async Task<IJSObjectReference> GetQRBarcodeModuleAsync()
    {
        _qrBarcodeModule ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/qrBarcodeInterop.js");
        return _qrBarcodeModule;
    }

    public async Task<List<SplitPdfResult>?> SplitPdfAsync(byte[] pdfBytes, List<PageRange> ranges)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<List<SplitPdfResult>?>("splitPDF", pdfBytes, ranges);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error splitting PDF: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> ExtractPagesAsync(byte[] pdfBytes, List<int> pageNumbers)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("extractPages", pdfBytes, pageNumbers);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error extracting pages: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> DeletePagesAsync(byte[] pdfBytes, List<int> pageNumbers)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("deletePages", pdfBytes, pageNumbers);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting pages: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> AddWatermarkAsync(byte[] pdfBytes, string watermarkText, WatermarkOptions? options = null)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("addWatermark", pdfBytes, watermarkText, options ?? new WatermarkOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding watermark: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> AddImageWatermarkAsync(byte[] pdfBytes, byte[] imageBytes, string imageType, ImageWatermarkOptions? options = null)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("addImageWatermark", pdfBytes, imageBytes, imageType, options ?? new ImageWatermarkOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding image watermark: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> AddPageNumbersAsync(byte[] pdfBytes, PageNumberOptions? options = null)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("addPageNumbers", pdfBytes, options ?? new PageNumberOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding page numbers: {ex.Message}");
            return null;
        }
    }

    public async Task<string?> GenerateQRCodeAsync(string text, QRCodeOptions? options = null)
    {
        try
        {
            var module = await GetQRBarcodeModuleAsync();
            return await module.InvokeAsync<string?>("generateQRCode", text, options ?? new QRCodeOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error generating QR code: {ex.Message}");
            return null;
        }
    }

    public async Task<string?> GenerateBarcodeAsync(string text, string format, BarcodeOptions? options = null)
    {
        try
        {
            var module = await GetQRBarcodeModuleAsync();
            return await module.InvokeAsync<string?>("generateBarcode", text, format, options ?? new BarcodeOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error generating barcode: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> AddQRCodeToPdfAsync(byte[] pdfBytes, string qrText, int pageNumber, int x, int y, int size, QRCodeOptions? options = null)
    {
        try
        {
            var module = await GetQRBarcodeModuleAsync();
            return await module.InvokeAsync<byte[]?>("addQRCodeToPDF", pdfBytes, qrText, pageNumber, x, y, size, options ?? new QRCodeOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding QR code to PDF: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> AddBarcodeToPdfAsync(byte[] pdfBytes, string barcodeText, string format, int pageNumber, int x, int y, int width, int height, BarcodeOptions? options = null)
    {
        try
        {
            var module = await GetQRBarcodeModuleAsync();
            return await module.InvokeAsync<byte[]?>("addBarcodeToPDF", pdfBytes, barcodeText, format, pageNumber, x, y, width, height, options ?? new BarcodeOptions());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding barcode to PDF: {ex.Message}");
            return null;
        }
    }

    public async Task<List<BarcodeFormat>> GetSupportedBarcodeFormatsAsync()
    {
        try
        {
            var module = await GetQRBarcodeModuleAsync();
            var result = await module.InvokeAsync<List<BarcodeFormat>>("getSupportedBarcodeFormats");
            return result ?? new List<BarcodeFormat>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting barcode formats: {ex.Message}");
            return new List<BarcodeFormat>();
        }
    }

    public async Task<byte[]?> CompressPdfAsync(byte[] pdfBytes, string quality = "medium")
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("compressPDF", pdfBytes, quality);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error compressing PDF: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> ProtectPdfAsync(byte[] pdfBytes, string userPassword, string? ownerPassword = null)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("protectPDF", pdfBytes, userPassword, ownerPassword);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error protecting PDF: {ex.Message}");
            return null;
        }
    }

    public async Task<PdfMetadata?> GetMetadataAsync(byte[] pdfBytes)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<PdfMetadata?>("getMetadata", pdfBytes);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting metadata: {ex.Message}");
            return null;
        }
    }

    public async Task<byte[]?> EditMetadataAsync(byte[] pdfBytes, PdfMetadata metadata)
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            return await module.InvokeAsync<byte[]?>("editMetadata", pdfBytes, metadata);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error editing metadata: {ex.Message}");
            return null;
        }
    }

    public async Task<List<PdfPageImage>> ConvertPdfToImagesAsync(byte[] pdfBytes, double scale = 2.0, string format = "png")
    {
        try
        {
            var module = await GetAdvancedModuleAsync();
            var result = await module.InvokeAsync<List<PdfPageImage>>("pdfPagesToImages", pdfBytes, scale, format);
            return result ?? new List<PdfPageImage>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error converting PDF to images: {ex.Message}");
            return new List<PdfPageImage>();
        }
    }
}
