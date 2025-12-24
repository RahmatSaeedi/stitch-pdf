namespace PdfMerger.Client.Models;

public enum TemplateType
{
    MergeSettings,
    ConversionSettings,
    BatchOperation,
    AdvancedOperation
}

public class Template
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TemplateType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime LastUsed { get; set; } = DateTime.Now;
    public int UsageCount { get; set; }
    public Dictionary<string, object> Settings { get; set; } = new();
    public string? Icon { get; set; }
    public string? Category { get; set; }
    public bool IsFavorite { get; set; }
}

public class TemplateCategory
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public List<Template> Templates { get; set; } = new();
}

// Pre-defined template configurations
public static class DefaultTemplates
{
    public static List<Template> GetDefaultTemplates()
    {
        return new List<Template>
        {
            new Template
            {
                Name = "Standard Merge",
                Description = "Merge PDFs with default settings",
                Type = TemplateType.MergeSettings,
                Category = "Merge",
                Icon = "merge",
                Settings = new Dictionary<string, object>
                {
                    { "PageSize", "A4" },
                    { "Orientation", "Portrait" },
                    { "ImageQuality", 90 }
                }
            },
            new Template
            {
                Name = "High Quality Print",
                Description = "Optimize for printing with high quality",
                Type = TemplateType.ConversionSettings,
                Category = "Print",
                Icon = "print",
                Settings = new Dictionary<string, object>
                {
                    { "PageSize", "A4" },
                    { "Orientation", "Portrait" },
                    { "ImageQuality", 100 },
                    { "IncludeMetadata", true }
                }
            },
            new Template
            {
                Name = "Web Optimized",
                Description = "Smaller file size for web sharing",
                Type = TemplateType.ConversionSettings,
                Category = "Web",
                Icon = "web",
                Settings = new Dictionary<string, object>
                {
                    { "PageSize", "A4" },
                    { "Orientation", "Portrait" },
                    { "ImageQuality", 75 },
                    { "CompressImages", true }
                }
            },
            new Template
            {
                Name = "Batch Compress Medium",
                Description = "Compress multiple PDFs with medium quality",
                Type = TemplateType.BatchOperation,
                Category = "Batch",
                Icon = "compress",
                Settings = new Dictionary<string, object>
                {
                    { "OperationType", "Compress" },
                    { "Quality", "medium" }
                }
            },
            new Template
            {
                Name = "Confidential Watermark",
                Description = "Add 'CONFIDENTIAL' watermark to documents",
                Type = TemplateType.BatchOperation,
                Category = "Batch",
                Icon = "security",
                Settings = new Dictionary<string, object>
                {
                    { "OperationType", "Watermark" },
                    { "WatermarkText", "CONFIDENTIAL" },
                    { "Opacity", 0.3 }
                }
            },
            new Template
            {
                Name = "Legal Document",
                Description = "Format for legal documents with page numbers",
                Type = TemplateType.AdvancedOperation,
                Category = "Professional",
                Icon = "gavel",
                Settings = new Dictionary<string, object>
                {
                    { "PageSize", "Letter" },
                    { "Orientation", "Portrait" },
                    { "AddPageNumbers", true },
                    { "PageNumberPosition", "bottom-center" },
                    { "Margins", "1 inch" }
                }
            },
            new Template
            {
                Name = "Invoice Template",
                Description = "Settings for invoice PDFs",
                Type = TemplateType.ConversionSettings,
                Category = "Business",
                Icon = "receipt",
                Settings = new Dictionary<string, object>
                {
                    { "PageSize", "A4" },
                    { "Orientation", "Portrait" },
                    { "IncludeMetadata", true },
                    { "ImageQuality", 90 }
                }
            },
            new Template
            {
                Name = "Photo Album",
                Description = "Optimize for photo collections",
                Type = TemplateType.ConversionSettings,
                Category = "Photos",
                Icon = "photo_library",
                Settings = new Dictionary<string, object>
                {
                    { "PageSize", "A4" },
                    { "Orientation", "Landscape" },
                    { "ImageQuality", 95 },
                    { "FitToPage", true }
                }
            }
        };
    }
}
