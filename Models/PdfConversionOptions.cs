namespace PdfMerger.Client.Models;

public class PdfConversionOptions
{
    // Page Settings
    public PageSize PageSize { get; set; } = PageSize.A4;
    public PageOrientation Orientation { get; set; } = PageOrientation.Portrait;
    public Margins Margins { get; set; } = new();
    public bool NormalizePageSizes { get; set; } = true; // Make all pages same size (uses PageSize setting)

    // Page Numbering
    public bool AddPageNumbers { get; set; }
    public PageNumberPosition NumberPosition { get; set; } = PageNumberPosition.BottomCenter;
    public string NumberFormat { get; set; } = "Page {0}";

    // Image Settings
    public int ImageQuality { get; set; } = 100; // 0-100 (100 = maximum quality, no compression for speed)
    public bool CompressImages { get; set; } = false; // Disabled by default for speed
    public bool AutoRotateFromExif { get; set; } = false; // Disabled by default
    public ImageCropMode CropMode { get; set; } = ImageCropMode.None;

    // Export Settings
    public string OutputFilename { get; set; } = "merged_{timestamp}.pdf";
    public CompressionLevel Compression { get; set; } = CompressionLevel.None; // No compression by default for speed
    public string? Password { get; set; }
    public ExportFormat Format { get; set; } = ExportFormat.PDF;
}

public enum PageSize
{
    A4,
    A3,
    A5,
    Letter,
    Legal,
    Tabloid
}

public enum PageOrientation
{
    Portrait,
    Landscape
}

public enum PageNumberPosition
{
    TopLeft,
    TopCenter,
    TopRight,
    BottomLeft,
    BottomCenter,
    BottomRight
}

public enum ImageCropMode
{
    None,
    Fit,
    Fill,
    Stretch,
    Custom
}

public enum CompressionLevel
{
    None,
    Low,
    Medium,
    High
}

public enum ExportFormat
{
    PDF,
    PDFA
}

public class Margins
{
    public int Top { get; set; } = 72;    // 1 inch in points (72 points = 1 inch)
    public int Right { get; set; } = 72;
    public int Bottom { get; set; } = 72;
    public int Left { get; set; } = 72;
}
