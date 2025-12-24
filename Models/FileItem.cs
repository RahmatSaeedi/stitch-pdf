namespace PdfMerger.Client.Models;

public class FileItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public string? ThumbnailDataUrl { get; set; }
    public int Order { get; set; }

    // Rotation for entire file (images, documents) - in degrees (0, 90, 180, 270)
    public int Rotation { get; set; } = 0;

    // Page manipulation properties (for PDFs)
    public int? PageCount { get; set; }
    public List<int> SelectedPages { get; set; } = new(); // Empty = all pages
    public Dictionary<int, int> PageRotations { get; set; } = new(); // pageIndex -> rotation degrees

    // Per-file conversion overrides (null = use global settings)
    public PdfConversionOptions? ConversionOverrides { get; set; }
}
