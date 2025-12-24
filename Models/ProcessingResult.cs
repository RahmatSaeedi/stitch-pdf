namespace PdfMerger.Client.Models;

public class ProcessingResult
{
    public bool Success { get; set; }
    public byte[]? Data { get; set; }
    public string? ErrorMessage { get; set; }

    public static ProcessingResult SuccessResult(byte[] data) => new()
    {
        Success = true,
        Data = data
    };

    public static ProcessingResult Failure(string errorMessage) => new()
    {
        Success = false,
        ErrorMessage = errorMessage
    };
}
