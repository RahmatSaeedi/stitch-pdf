using PdfMerger.Client.Models;

namespace PdfMerger.Client.Services;

public interface ISignatureService
{
    Task<byte[]?> AddSignatureToPdfAsync(byte[] pdfBytes, string signatureDataUrl, int pageNumber, int x, int y, int width, int height);
    Task<string?> CreateTypedSignatureAsync(string text, string fontFamily, int fontSize, string color);
    Task<bool> SaveSignatureAsync(string name, string dataUrl);
    Task<List<SavedSignature>> GetSavedSignaturesAsync();
    Task<bool> DeleteSignatureAsync(string name);
}

public class SavedSignature
{
    public string Name { get; set; } = string.Empty;
    public string DataUrl { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class SignatureResult
{
    public string DataUrl { get; set; } = string.Empty;
    public int PageNumber { get; set; } = 0;
    public int X { get; set; } = 400;
    public int Y { get; set; } = 700;
    public int Width { get; set; } = 150;
    public int Height { get; set; } = 50;
    public bool HasTransparentBackground { get; set; } = true;
}
