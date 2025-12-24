using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface IOcrService
{
    Task<bool> InitializeAsync(string language = "eng");
    Task<OcrResult?> PerformOcrAsync(byte[] imageBytes, string language = "eng", IProgress<int>? progress = null);
    Task<PdfOcrResult?> PerformOcrOnPdfAsync(byte[] pdfBytes, string language = "eng", IProgress<PdfOcrProgress>? progress = null);
    Task<byte[]?> MakePdfSearchableAsync(byte[] pdfBytes, PdfOcrResult ocrResults);
    Task<List<OcrLanguage>> GetSupportedLanguagesAsync();
    Task DisposeAsync();
}

public class OcrResult
{
    public string Text { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public List<OcrWord> Words { get; set; } = new();
    public List<OcrLine> Lines { get; set; } = new();
    public string? Error { get; set; }
}

public class OcrWord
{
    public string Text { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public BoundingBox BBox { get; set; } = new();
}

public class OcrLine
{
    public string Text { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public BoundingBox BBox { get; set; } = new();
}

public class BoundingBox
{
    public int X0 { get; set; }
    public int Y0 { get; set; }
    public int X1 { get; set; }
    public int Y1 { get; set; }
}

public class PdfOcrResult
{
    public bool Success { get; set; }
    public List<PageOcrResult> Pages { get; set; } = new();
    public int TotalPages { get; set; }
    public string? Error { get; set; }
}

public class PageOcrResult
{
    public int PageNumber { get; set; }
    public string Text { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public List<OcrWord> Words { get; set; } = new();
    public List<OcrLine> Lines { get; set; } = new();
}

public class PdfOcrProgress
{
    public int CurrentPage { get; set; }
    public int TotalPages { get; set; }
    public int Percentage => TotalPages > 0 ? (CurrentPage * 100 / TotalPages) : 0;
}

public class OcrLanguage
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
