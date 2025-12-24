namespace PdfMerger.Client.Models;

public class SplitPdfOptions
{
    public SplitMode Mode { get; set; } = SplitMode.PageRanges;
    public List<PageRange> Ranges { get; set; } = new();
    public int PagesPerFile { get; set; } = 1; // For SplitMode.EveryNPages
}

public enum SplitMode
{
    PageRanges,
    EveryNPages,
    SinglePages
}

public class PageRange
{
    public int Start { get; set; }
    public int End { get; set; }
    public string OutputName { get; set; } = "split_{index}.pdf";
}
