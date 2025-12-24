using CsvHelper;
using CsvHelper.Configuration;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Markdig;
using Microsoft.JSInterop;
using PdfMerger.Client.Models;
using System.Globalization;
using System.Text;

namespace PdfMerger.Client.Services.Conversion;

/// <summary>
/// Service for converting various document formats (DOCX, CSV, Markdown) to PDF using C# libraries
/// This provides better performance and accuracy compared to JavaScript libraries
/// </summary>
public class DocxConversionService : IDocumentConversionService, IAsyncDisposable
{
    private readonly Lazy<Task<IJSObjectReference>> _moduleTask;

    public DocxConversionService(IJSRuntime jsRuntime)
    {
        _moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>(
            "import", "./js/pdfInterop.js").AsTask());
    }

    public async Task<byte[]> ConvertDocxToPdfAsync(
        byte[] docxData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            // Extract HTML from DOCX using Open XML SDK (C#)
            var htmlContent = await ExtractHtmlFromDocx(docxData);
            progress?.Report(50);

            // Wrap HTML in a styled container (similar to addDocxAsPdf in pdfInterop.js)
            var styledHtml = $@"
                <div style=""font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; line-height: 1.6;"">
                    {htmlContent}
                </div>
            ";

            // Convert to bytes for JS interop
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(styledHtml);

            // Use existing JS pipeline: HTML → html2canvas → pdf-lib → PDF
            var module = await _moduleTask.Value;

            // Create anonymous object matching the JavaScript interface
            var fileData = new
            {
                bytes = htmlBytes,
                type = "text/html"
            };

            // The JS function addHtmlAsPdf will handle conversion to PDF
            // We need to call the internal function through mergePdfs with a single HTML file
            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>(
                "mergePdfs",
                filesData,
                null, // no progress callback needed for single file
                options);

            progress?.Report(100);
            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert DOCX to PDF: {ex.Message}", ex);
        }
    }

    public async Task<string> GenerateDocxPreviewHtmlAsync(byte[] docxData)
    {
        return await Task.Run(() => ExtractHtmlFromDocx(docxData));
    }

    private async Task<string> ExtractHtmlFromDocx(byte[] docxData)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var memStream = new MemoryStream(docxData);
                using var wordDoc = WordprocessingDocument.Open(memStream, false);

                if (wordDoc.MainDocumentPart?.Document?.Body == null)
                {
                    throw new Exception("Invalid DOCX document structure");
                }

                var body = wordDoc.MainDocumentPart.Document.Body;
                var htmlBuilder = new StringBuilder();

                // Convert OpenXML elements to HTML
                foreach (var element in body.Elements())
                {
                    htmlBuilder.Append(ConvertElementToHtml(element));
                }

                return htmlBuilder.ToString();
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to extract HTML from DOCX: {ex.Message}", ex);
            }
        });
    }

    private string ConvertElementToHtml(OpenXmlElement element)
    {
        return element switch
        {
            Paragraph paragraph => ConvertParagraphToHtml(paragraph),
            Table table => ConvertTableToHtml(table),
            SectionProperties _ => string.Empty, // Skip section properties
            _ => $"<!-- Unsupported element: {element.GetType().Name} -->"
        };
    }

    private string ConvertParagraphToHtml(Paragraph paragraph)
    {
        var htmlBuilder = new StringBuilder();
        var textContent = new StringBuilder();

        // Check paragraph properties for styling
        var paragraphProperties = paragraph.ParagraphProperties;
        var style = GetParagraphStyle(paragraphProperties);

        // Process runs (text segments with formatting)
        foreach (var run in paragraph.Elements<Run>())
        {
            var runProperties = run.RunProperties;
            var runStyle = GetRunStyle(runProperties);

            var text = string.Join("", run.Elements<Text>().Select(t => t.Text));

            if (!string.IsNullOrEmpty(text))
            {
                if (!string.IsNullOrEmpty(runStyle))
                {
                    textContent.Append($"<span style=\"{runStyle}\">{EscapeHtml(text)}</span>");
                }
                else
                {
                    textContent.Append(EscapeHtml(text));
                }
            }
        }

        var content = textContent.ToString();

        if (string.IsNullOrWhiteSpace(content))
        {
            return "<p style=\"margin: 0.5em 0;\">&nbsp;</p>"; // Empty paragraph
        }

        // Determine paragraph tag based on style
        if (style.Contains("Heading") || style.Contains("Title"))
        {
            var level = ExtractHeadingLevel(style);
            return $"<h{level} style=\"margin: 1em 0 0.5em 0;\">{content}</h{level}>";
        }
        else if (style.Contains("list"))
        {
            return $"<li>{content}</li>";
        }
        else
        {
            return $"<p style=\"margin: 0.5em 0;\">{content}</p>";
        }
    }

    private string GetParagraphStyle(ParagraphProperties? properties)
    {
        if (properties?.ParagraphStyleId?.Val?.Value != null)
        {
            return properties.ParagraphStyleId.Val.Value;
        }
        return "Normal";
    }

    private string GetRunStyle(RunProperties? properties)
    {
        if (properties == null)
            return string.Empty;

        var styles = new List<string>();

        if (properties.Bold != null && properties.Bold.Val != false)
        {
            styles.Add("font-weight: bold");
        }

        if (properties.Italic != null && properties.Italic.Val != false)
        {
            styles.Add("font-style: italic");
        }

        if (properties.Underline != null)
        {
            styles.Add("text-decoration: underline");
        }

        if (properties.FontSize != null && int.TryParse(properties.FontSize.Val, out int fontSize))
        {
            // FontSize in OpenXML is in half-points, so divide by 2
            styles.Add($"font-size: {fontSize / 2}pt");
        }

        if (properties.Color?.Val?.Value != null)
        {
            var color = properties.Color.Val.Value;
            if (color != "auto")
            {
                styles.Add($"color: #{color}");
            }
        }

        return styles.Count > 0 ? string.Join("; ", styles) : string.Empty;
    }

    private int ExtractHeadingLevel(string style)
    {
        // Extract number from style like "Heading1", "Heading2", etc.
        if (style.Contains("Heading"))
        {
            var numberStr = new string(style.Where(char.IsDigit).ToArray());
            if (int.TryParse(numberStr, out int level) && level >= 1 && level <= 6)
            {
                return level;
            }
        }
        return 2; // Default to h2
    }

    private string ConvertTableToHtml(Table table)
    {
        var htmlBuilder = new StringBuilder();
        htmlBuilder.AppendLine("<table style=\"border-collapse: collapse; width: 100%; margin: 1em 0;\">");

        foreach (var row in table.Elements<TableRow>())
        {
            htmlBuilder.AppendLine("<tr>");

            foreach (var cell in row.Elements<TableCell>())
            {
                var cellContent = new StringBuilder();

                foreach (var paragraph in cell.Elements<Paragraph>())
                {
                    cellContent.Append(ConvertParagraphToHtml(paragraph));
                }

                htmlBuilder.AppendLine($"<td style=\"border: 1px solid #ddd; padding: 8px;\">{cellContent}</td>");
            }

            htmlBuilder.AppendLine("</tr>");
        }

        htmlBuilder.AppendLine("</table>");
        return htmlBuilder.ToString();
    }

    private string EscapeHtml(string text)
    {
        if (string.IsNullOrEmpty(text))
            return text;

        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }

    public async Task<byte[]> ConvertCsvToPdfAsync(
        byte[] csvData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            // Parse CSV using CsvHelper (C# - faster and more reliable than papaparse.js)
            var htmlContent = await Task.Run(() => ParseCsvToHtml(csvData));
            progress?.Report(50);

            // Wrap in styled container
            var styledHtml = $@"
                <div style=""font-family: 'Segoe UI', Arial, sans-serif; padding: 30px;"">
                    {htmlContent}
                </div>
            ";

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(styledHtml);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert CSV to PDF: {ex.Message}", ex);
        }
    }

    private string ParseCsvToHtml(byte[] csvData)
    {
        using var memStream = new MemoryStream(csvData);
        using var reader = new StreamReader(memStream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            BadDataFound = null
        });

        // Read all records
        var records = new List<Dictionary<string, string>>();
        csv.Read();
        csv.ReadHeader();
        var headers = csv.HeaderRecord ?? Array.Empty<string>();

        while (csv.Read())
        {
            var record = new Dictionary<string, string>();
            foreach (var header in headers)
            {
                record[header] = csv.GetField(header) ?? string.Empty;
            }
            records.Add(record);
        }

        // Build HTML table
        var htmlBuilder = new StringBuilder();
        htmlBuilder.AppendLine("<table style=\"border-collapse: collapse; width: 100%; font-size: 11px;\">");

        // Header
        htmlBuilder.AppendLine("<thead><tr>");
        foreach (var header in headers)
        {
            htmlBuilder.AppendLine($"<th style=\"border: 1px solid #ddd; padding: 8px; background-color: #217346; color: white; font-weight: bold;\">{EscapeHtml(header)}</th>");
        }
        htmlBuilder.AppendLine("</tr></thead>");

        // Data rows
        htmlBuilder.AppendLine("<tbody>");
        for (int i = 0; i < records.Count; i++)
        {
            var bgColor = i % 2 == 0 ? "#f2f2f2" : "white";
            htmlBuilder.AppendLine($"<tr style=\"background-color: {bgColor};\">");

            foreach (var header in headers)
            {
                var value = records[i].ContainsKey(header) ? records[i][header] : string.Empty;
                htmlBuilder.AppendLine($"<td style=\"border: 1px solid #ddd; padding: 8px;\">{EscapeHtml(value)}</td>");
            }

            htmlBuilder.AppendLine("</tr>");
        }
        htmlBuilder.AppendLine("</tbody></table>");

        return htmlBuilder.ToString();
    }

    public async Task<byte[]> ConvertMarkdownToPdfAsync(
        byte[] markdownData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            // Parse Markdown using Markdig (C# - more features than marked.js)
            var htmlContent = await Task.Run(() => ParseMarkdownToHtml(markdownData));
            progress?.Report(50);

            // Wrap in styled container
            var styledHtml = $@"
                <div style=""font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; line-height: 1.6;"">
                    {htmlContent}
                </div>
            ";

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(styledHtml);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert Markdown to PDF: {ex.Message}", ex);
        }
    }

    private string ParseMarkdownToHtml(byte[] markdownData)
    {
        var markdownText = System.Text.Encoding.UTF8.GetString(markdownData);

        // Use Markdig pipeline with advanced features
        var pipeline = new MarkdownPipelineBuilder()
            .UseAdvancedExtensions()  // Tables, task lists, etc.
            .Build();

        return Markdown.ToHtml(markdownText, pipeline);
    }

    public async Task<byte[]> ConvertTextToPdfAsync(
        byte[] textData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            var textContent = System.Text.Encoding.UTF8.GetString(textData);

            // Format text with monospace font and preserve whitespace
            var htmlContent = $@"
                <pre style=""font-family: 'Consolas', 'Courier New', monospace;
                            font-size: 11px;
                            line-height: 1.5;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            margin: 0;
                            padding: 20px;
                            background-color: #f5f5f5;
                            border: 1px solid #ddd;"">{EscapeHtml(textContent)}</pre>
            ";

            progress?.Report(50);

            var styledHtml = $@"
                <div style=""font-family: 'Segoe UI', Arial, sans-serif; padding: 20px;"">
                    {htmlContent}
                </div>
            ";

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(styledHtml);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert text to PDF: {ex.Message}", ex);
        }
    }

    public async Task<byte[]> ConvertHtmlToPdfAsync(
        byte[] htmlData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            var htmlContent = System.Text.Encoding.UTF8.GetString(htmlData);

            // Add CSS reset and better styling for HTML content
            var styledHtml = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset=""UTF-8"">
                    <style>
                        body {{
                            font-family: 'Segoe UI', Arial, sans-serif;
                            line-height: 1.6;
                            padding: 40px;
                            max-width: 800px;
                            margin: 0 auto;
                            background-color: white;
                        }}
                        img {{
                            max-width: 100%;
                            height: auto;
                        }}
                        table {{
                            border-collapse: collapse;
                            width: 100%;
                            margin: 1em 0;
                        }}
                        th, td {{
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }}
                        th {{
                            background-color: #f2f2f2;
                            font-weight: bold;
                        }}
                        code {{
                            background-color: #f4f4f4;
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-family: 'Consolas', 'Courier New', monospace;
                        }}
                        pre {{
                            background-color: #f4f4f4;
                            padding: 12px;
                            border-radius: 4px;
                            overflow-x: auto;
                        }}
                    </style>
                </head>
                <body>
                    {htmlContent}
                </body>
                </html>
            ";

            progress?.Report(50);

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(styledHtml);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert HTML to PDF: {ex.Message}", ex);
        }
    }

    public async Task<byte[]> ConvertXmlToPdfAsync(
        byte[] xmlData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            var xmlContent = System.Text.Encoding.UTF8.GetString(xmlData);

            // Format and syntax highlight XML
            var formattedXml = FormatXml(xmlContent);
            progress?.Report(30);

            var htmlContent = $@"
                <div style=""font-family: 'Consolas', 'Courier New', monospace;
                            font-size: 10px;
                            line-height: 1.5;
                            padding: 20px;
                            background-color: #f5f5f5;"">
                    <h3 style=""font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin-bottom: 15px;"">XML Document</h3>
                    <pre style=""margin: 0;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                                background-color: #ffffff;
                                padding: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;"">{SyntaxHighlightXml(formattedXml)}</pre>
                </div>
            ";

            progress?.Report(60);

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(htmlContent);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert XML to PDF: {ex.Message}", ex);
        }
    }

    public async Task<byte[]> ConvertJsonToPdfAsync(
        byte[] jsonData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            var jsonContent = System.Text.Encoding.UTF8.GetString(jsonData);

            // Format and syntax highlight JSON
            var formattedJson = FormatJson(jsonContent);
            progress?.Report(30);

            var htmlContent = $@"
                <div style=""font-family: 'Consolas', 'Courier New', monospace;
                            font-size: 10px;
                            line-height: 1.5;
                            padding: 20px;
                            background-color: #f5f5f5;"">
                    <h3 style=""font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin-bottom: 15px;"">JSON Document</h3>
                    <pre style=""margin: 0;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                                background-color: #ffffff;
                                padding: 15px;
                                border: 1px solid #ddd;
                                border-radius: 4px;"">{SyntaxHighlightJson(formattedJson)}</pre>
                </div>
            ";

            progress?.Report(60);

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(htmlContent);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert JSON to PDF: {ex.Message}", ex);
        }
    }

    public async Task<byte[]> ConvertEpubToPdfAsync(
        byte[] epubData,
        PdfConversionOptions? options = null,
        IProgress<int>? progress = null)
    {
        try
        {
            progress?.Report(10);

            // Extract and parse EPUB content
            var htmlContent = await ExtractEpubContent(epubData);
            progress?.Report(50);

            // Wrap in styled container
            var styledHtml = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset=""UTF-8"">
                    <style>
                        body {{
                            font-family: 'Georgia', 'Times New Roman', serif;
                            line-height: 1.6;
                            padding: 40px;
                            max-width: 800px;
                            margin: 0 auto;
                            background-color: white;
                            color: #333;
                        }}
                        h1, h2, h3, h4, h5, h6 {{
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin-top: 1.5em;
                            margin-bottom: 0.5em;
                            color: #222;
                        }}
                        p {{
                            margin: 0.8em 0;
                            text-align: justify;
                        }}
                        img {{
                            max-width: 100%;
                            height: auto;
                            display: block;
                            margin: 1em auto;
                        }}
                        blockquote {{
                            margin: 1em 2em;
                            padding-left: 1em;
                            border-left: 3px solid #ccc;
                            font-style: italic;
                        }}
                    </style>
                </head>
                <body>
                    {htmlContent}
                </body>
                </html>
            ";

            progress?.Report(70);

            // Convert to PDF via JavaScript pipeline
            var htmlBytes = System.Text.Encoding.UTF8.GetBytes(styledHtml);
            var module = await _moduleTask.Value;

            var filesData = new[] { new {
                bytes = htmlBytes,
                type = "text/html",
                selectedPages = Array.Empty<int>(),
                pageRotations = new Dictionary<int, int>(),
                rotation = 0,
                conversionOverrides = options
            }};

            var resultBytes = await module.InvokeAsync<byte[]>("mergePdfs", filesData, null, options);
            progress?.Report(100);

            return resultBytes;
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to convert EPUB to PDF: {ex.Message}", ex);
        }
    }

    private string FormatXml(string xml)
    {
        try
        {
            using var stringReader = new System.IO.StringReader(xml);
            using var xmlReader = System.Xml.XmlReader.Create(stringReader);

            var settings = new System.Xml.XmlWriterSettings
            {
                Indent = true,
                IndentChars = "  ",
                NewLineChars = "\n",
                NewLineHandling = System.Xml.NewLineHandling.Replace,
                OmitXmlDeclaration = false
            };

            var stringBuilder = new StringBuilder();
            using (var xmlWriter = System.Xml.XmlWriter.Create(stringBuilder, settings))
            {
                xmlWriter.WriteNode(xmlReader, true);
            }

            return stringBuilder.ToString();
        }
        catch
        {
            // If formatting fails, return original
            return xml;
        }
    }

    private string SyntaxHighlightXml(string xml)
    {
        // Simple syntax highlighting for XML
        var highlighted = EscapeHtml(xml);

        // Highlight tags
        highlighted = System.Text.RegularExpressions.Regex.Replace(
            highlighted,
            @"(&lt;/?)([\w:]+)([^&]*?)(/?)(&gt;)",
            m => $"<span style=\"color: #881280;\">{m.Groups[1].Value}</span>" +
                 $"<span style=\"color: #1a1aa6;\">{m.Groups[2].Value}</span>" +
                 $"<span style=\"color: #994500;\">{m.Groups[3].Value}</span>" +
                 $"<span style=\"color: #881280;\">{m.Groups[4].Value}{m.Groups[5].Value}</span>"
        );

        // Highlight attribute values
        highlighted = System.Text.RegularExpressions.Regex.Replace(
            highlighted,
            @"=&quot;([^&]*?)&quot;",
            m => $"=<span style=\"color: #c41a16;\">&quot;{m.Groups[1].Value}&quot;</span>"
        );

        return highlighted;
    }

    private string FormatJson(string json)
    {
        try
        {
            var jsonElement = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(json);
            return System.Text.Json.JsonSerializer.Serialize(jsonElement, new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true
            });
        }
        catch
        {
            // If parsing fails, return original
            return json;
        }
    }

    private string SyntaxHighlightJson(string json)
    {
        // Simple syntax highlighting for JSON
        var highlighted = EscapeHtml(json);

        // Highlight strings (property names and values)
        highlighted = System.Text.RegularExpressions.Regex.Replace(
            highlighted,
            @"&quot;([^&]*?)&quot;",
            m => $"<span style=\"color: #c41a16;\">&quot;{m.Groups[1].Value}&quot;</span>"
        );

        // Highlight numbers
        highlighted = System.Text.RegularExpressions.Regex.Replace(
            highlighted,
            @"\b(\d+\.?\d*)\b",
            "<span style=\"color: #1c00cf;\">$1</span>"
        );

        // Highlight booleans and null
        highlighted = System.Text.RegularExpressions.Regex.Replace(
            highlighted,
            @"\b(true|false|null)\b",
            "<span style=\"color: #0000ff;\">$1</span>"
        );

        // Highlight brackets and braces
        highlighted = System.Text.RegularExpressions.Regex.Replace(
            highlighted,
            @"([\{\}\[\]])",
            "<span style=\"color: #000000; font-weight: bold;\">$1</span>"
        );

        return highlighted;
    }

    private async Task<string> ExtractEpubContent(byte[] epubData)
    {
        return await Task.Run(() =>
        {
            try
            {
                using var memStream = new MemoryStream(epubData);
                using var archive = new System.IO.Compression.ZipArchive(memStream, System.IO.Compression.ZipArchiveMode.Read);

                var contentBuilder = new StringBuilder();

                // Find and read the content.opf file to get reading order
                var opfEntry = archive.Entries.FirstOrDefault(e =>
                    e.FullName.EndsWith(".opf", StringComparison.OrdinalIgnoreCase));

                if (opfEntry != null)
                {
                    // Parse OPF to get reading order
                    using var opfStream = opfEntry.Open();
                    using var opfReader = new StreamReader(opfStream);
                    var opfContent = opfReader.ReadToEnd();

                    // Extract spine items (reading order)
                    var contentFiles = ExtractSpineItems(opfContent, archive, Path.GetDirectoryName(opfEntry.FullName) ?? "");

                    foreach (var content in contentFiles)
                    {
                        contentBuilder.AppendLine(content);
                        contentBuilder.AppendLine("<hr style=\"margin: 2em 0; border: none; border-top: 1px solid #ccc;\" />");
                    }
                }
                else
                {
                    // Fallback: read all HTML/XHTML files
                    foreach (var entry in archive.Entries.Where(e =>
                        e.FullName.EndsWith(".html", StringComparison.OrdinalIgnoreCase) ||
                        e.FullName.EndsWith(".xhtml", StringComparison.OrdinalIgnoreCase) ||
                        e.FullName.EndsWith(".htm", StringComparison.OrdinalIgnoreCase)))
                    {
                        using var stream = entry.Open();
                        using var reader = new StreamReader(stream);
                        var htmlContent = reader.ReadToEnd();

                        // Extract body content
                        var bodyContent = ExtractBodyContent(htmlContent);
                        contentBuilder.AppendLine(bodyContent);
                        contentBuilder.AppendLine("<hr style=\"margin: 2em 0; border: none; border-top: 1px solid #ccc;\" />");
                    }
                }

                var result = contentBuilder.ToString();
                return string.IsNullOrWhiteSpace(result)
                    ? "<p>No readable content found in EPUB file.</p>"
                    : result;
            }
            catch (Exception ex)
            {
                return $"<p>Error reading EPUB file: {EscapeHtml(ex.Message)}</p>";
            }
        });
    }

    private List<string> ExtractSpineItems(string opfContent, System.IO.Compression.ZipArchive archive, string basePath)
    {
        var contentList = new List<string>();

        try
        {
            using var stringReader = new StringReader(opfContent);
            using var xmlReader = System.Xml.XmlReader.Create(stringReader);

            var manifestItems = new Dictionary<string, string>();
            var spineItems = new List<string>();

            // Parse manifest
            while (xmlReader.Read())
            {
                if (xmlReader.NodeType == System.Xml.XmlNodeType.Element && xmlReader.Name == "item")
                {
                    var id = xmlReader.GetAttribute("id");
                    var href = xmlReader.GetAttribute("href");
                    if (id != null && href != null)
                    {
                        manifestItems[id] = href;
                    }
                }
                else if (xmlReader.NodeType == System.Xml.XmlNodeType.Element && xmlReader.Name == "itemref")
                {
                    var idref = xmlReader.GetAttribute("idref");
                    if (idref != null)
                    {
                        spineItems.Add(idref);
                    }
                }
            }

            // Read files in spine order
            foreach (var itemId in spineItems)
            {
                if (manifestItems.TryGetValue(itemId, out var href))
                {
                    var fullPath = string.IsNullOrEmpty(basePath)
                        ? href
                        : Path.Combine(basePath, href).Replace('\\', '/');

                    var entry = archive.Entries.FirstOrDefault(e =>
                        e.FullName.Replace('\\', '/').Equals(fullPath, StringComparison.OrdinalIgnoreCase));

                    if (entry != null)
                    {
                        using var stream = entry.Open();
                        using var reader = new StreamReader(stream);
                        var htmlContent = reader.ReadToEnd();
                        contentList.Add(ExtractBodyContent(htmlContent));
                    }
                }
            }
        }
        catch
        {
            // If parsing fails, return empty list and fallback will be used
        }

        return contentList;
    }

    private string ExtractBodyContent(string html)
    {
        try
        {
            // Simple extraction of body content
            var bodyMatch = System.Text.RegularExpressions.Regex.Match(
                html,
                @"<body[^>]*>(.*?)</body>",
                System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );

            if (bodyMatch.Success)
            {
                return bodyMatch.Groups[1].Value;
            }

            // If no body tag, return the whole content (might be a fragment)
            return html;
        }
        catch
        {
            return html;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_moduleTask.IsValueCreated)
        {
            var module = await _moduleTask.Value;
            await module.DisposeAsync();
        }
    }
}
