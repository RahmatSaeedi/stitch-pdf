namespace PdfMerger.Client.Services.Conversion;

/// <summary>
/// Service for converting document formats (DOCX, CSV, Markdown) to PDF using C# libraries
/// </summary>
public interface IDocumentConversionService
{
    /// <summary>
    /// Converts a DOCX document to PDF format using Open XML SDK
    /// </summary>
    /// <param name="docxData">The DOCX file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertDocxToPdfAsync(
        byte[] docxData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Converts a CSV file to PDF format using CsvHelper
    /// </summary>
    /// <param name="csvData">The CSV file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertCsvToPdfAsync(
        byte[] csvData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Converts a Markdown file to PDF format using Markdig
    /// </summary>
    /// <param name="markdownData">The Markdown file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertMarkdownToPdfAsync(
        byte[] markdownData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Converts a plain text file to PDF format with better formatting
    /// </summary>
    /// <param name="textData">The text file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertTextToPdfAsync(
        byte[] textData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Converts an HTML file to PDF format with improved rendering
    /// </summary>
    /// <param name="htmlData">The HTML file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertHtmlToPdfAsync(
        byte[] htmlData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Generates HTML preview from DOCX for thumbnail generation
    /// </summary>
    /// <param name="docxData">The DOCX file data as byte array</param>
    /// <returns>HTML string representation of the document</returns>
    Task<string> GenerateDocxPreviewHtmlAsync(byte[] docxData);

    /// <summary>
    /// Converts an XML file to PDF format with syntax highlighting
    /// </summary>
    /// <param name="xmlData">The XML file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertXmlToPdfAsync(
        byte[] xmlData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Converts a JSON file to PDF format with syntax highlighting
    /// </summary>
    /// <param name="jsonData">The JSON file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertJsonToPdfAsync(
        byte[] jsonData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );

    /// <summary>
    /// Converts an EPUB file to PDF format
    /// </summary>
    /// <param name="epubData">The EPUB file data as byte array</param>
    /// <param name="options">Optional PDF conversion settings</param>
    /// <param name="progress">Optional progress reporter (0-100)</param>
    /// <returns>PDF file as byte array</returns>
    Task<byte[]> ConvertEpubToPdfAsync(
        byte[] epubData,
        Models.PdfConversionOptions? options = null,
        IProgress<int>? progress = null
    );
}
