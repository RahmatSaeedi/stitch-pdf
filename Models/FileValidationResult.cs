namespace PdfMerger.Client.Models;

public class FileValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }

    public static FileValidationResult Success() => new() { IsValid = true };

    public static FileValidationResult Error(string message) => new()
    {
        IsValid = false,
        ErrorMessage = message
    };
}
