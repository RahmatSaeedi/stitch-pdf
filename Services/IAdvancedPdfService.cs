using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface IAdvancedPdfService
{
    // PDF Splitting
    Task<List<SplitPdfResult>?> SplitPdfAsync(byte[] pdfBytes, List<PageRange> ranges);
    Task<byte[]?> ExtractPagesAsync(byte[] pdfBytes, List<int> pageNumbers);
    Task<byte[]?> DeletePagesAsync(byte[] pdfBytes, List<int> pageNumbers);

    // Watermarking
    Task<byte[]?> AddWatermarkAsync(byte[] pdfBytes, string watermarkText, WatermarkOptions? options = null);
    Task<byte[]?> AddImageWatermarkAsync(byte[] pdfBytes, byte[] imageBytes, string imageType, ImageWatermarkOptions? options = null);

    // Page Numbers
    Task<byte[]?> AddPageNumbersAsync(byte[] pdfBytes, PageNumberOptions? options = null);

    // QR Codes & Barcodes
    Task<string?> GenerateQRCodeAsync(string text, QRCodeOptions? options = null);
    Task<string?> GenerateBarcodeAsync(string text, string format, BarcodeOptions? options = null);
    Task<byte[]?> AddQRCodeToPdfAsync(byte[] pdfBytes, string qrText, int pageNumber, int x, int y, int size, QRCodeOptions? options = null);
    Task<byte[]?> AddBarcodeToPdfAsync(byte[] pdfBytes, string barcodeText, string format, int pageNumber, int x, int y, int width, int height, BarcodeOptions? options = null);
    Task<List<BarcodeFormat>> GetSupportedBarcodeFormatsAsync();

    // Compression & Protection
    Task<byte[]?> CompressPdfAsync(byte[] pdfBytes, string quality = "medium");
    Task<byte[]?> ProtectPdfAsync(byte[] pdfBytes, string userPassword, string? ownerPassword = null);

    // Metadata
    Task<PdfMetadata?> GetMetadataAsync(byte[] pdfBytes);
    Task<byte[]?> EditMetadataAsync(byte[] pdfBytes, PdfMetadata metadata);

    // Conversion
    Task<List<PdfPageImage>> ConvertPdfToImagesAsync(byte[] pdfBytes, double scale = 2.0, string format = "png");
}

public class SplitPdfResult
{
    public string Name { get; set; } = string.Empty;
    public byte[] Bytes { get; set; } = Array.Empty<byte>();
    public int PageCount { get; set; }
}

public class PageRange
{
    public int Start { get; set; }
    public int End { get; set; }
    public string? Name { get; set; }
}

public class WatermarkOptions
{
    public int FontSize { get; set; } = 48;
    public float Opacity { get; set; } = 0.3f;
    public int Rotation { get; set; } = -45;
    public string Color { get; set; } = "#000000";
}

public class ImageWatermarkOptions
{
    public float Scale { get; set; } = 0.3f;
    public float Opacity { get; set; } = 0.3f;
    public string Position { get; set; } = "center"; // top-left, top-right, bottom-left, bottom-right, center
}

public class PageNumberOptions
{
    public int FontSize { get; set; } = 10;
    public string Position { get; set; } = "bottom-center"; // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
    public string Format { get; set; } = "{page}"; // {page}, {total}, {page} of {total}
    public int StartPage { get; set; } = 1;
    public string Color { get; set; } = "#000000";
}

public class QRCodeOptions
{
    public int Width { get; set; } = 300;
    public int Margin { get; set; } = 2;
    public string DarkColor { get; set; } = "#000000";
    public string LightColor { get; set; } = "#FFFFFF";
    public string ErrorCorrection { get; set; } = "M"; // L, M, Q, H
}

public class BarcodeOptions
{
    public int Width { get; set; } = 2;
    public int Height { get; set; } = 100;
    public bool DisplayValue { get; set; } = true;
    public int FontSize { get; set; } = 20;
    public int Margin { get; set; } = 10;
    public string Background { get; set; } = "#FFFFFF";
    public string LineColor { get; set; } = "#000000";
}

public class BarcodeFormat
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class PdfMetadata
{
    public string? Title { get; set; }
    public string? Author { get; set; }
    public string? Subject { get; set; }
    public string? Keywords { get; set; }
    public string? Creator { get; set; }
    public string? Producer { get; set; }
    public string? CreationDate { get; set; }
    public string? ModificationDate { get; set; }
    public int PageCount { get; set; }
}

public class PdfPageImage
{
    public int PageNumber { get; set; }
    public string DataUrl { get; set; } = string.Empty;
    public byte[] Bytes { get; set; } = Array.Empty<byte>();
    public int Width { get; set; }
    public int Height { get; set; }
}
