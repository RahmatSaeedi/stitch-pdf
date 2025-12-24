using Microsoft.JSInterop;

namespace PdfMerger.Client.Services;

public class SignatureService : ISignatureService
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _module;

    public SignatureService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    private async Task<IJSObjectReference> GetModuleAsync()
    {
        _module ??= await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/signatureInterop.js");
        return _module;
    }

    public async Task<byte[]?> AddSignatureToPdfAsync(byte[] pdfBytes, string signatureDataUrl, int pageNumber, int x, int y, int width, int height)
    {
        try
        {
            var module = await GetModuleAsync();
            var result = await module.InvokeAsync<byte[]?>("addSignatureToPDF", pdfBytes, signatureDataUrl, pageNumber, x, y, width, height);
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error adding signature to PDF: {ex.Message}");
            return null;
        }
    }

    public async Task<string?> CreateTypedSignatureAsync(string text, string fontFamily, int fontSize, string color)
    {
        try
        {
            var module = await GetModuleAsync();
            var result = await module.InvokeAsync<string?>("createTypedSignature", text, fontFamily, fontSize, color);
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating typed signature: {ex.Message}");
            return null;
        }
    }

    public async Task<bool> SaveSignatureAsync(string name, string dataUrl)
    {
        try
        {
            var module = await GetModuleAsync();
            return await module.InvokeAsync<bool>("saveSignatureToStorage", name, dataUrl);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error saving signature: {ex.Message}");
            return false;
        }
    }

    public async Task<List<SavedSignature>> GetSavedSignaturesAsync()
    {
        try
        {
            var module = await GetModuleAsync();
            var result = await module.InvokeAsync<List<SavedSignature>>("getSavedSignatures");
            return result ?? new List<SavedSignature>();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error getting saved signatures: {ex.Message}");
            return new List<SavedSignature>();
        }
    }

    public async Task<bool> DeleteSignatureAsync(string name)
    {
        try
        {
            var module = await GetModuleAsync();
            return await module.InvokeAsync<bool>("deleteSignature", name);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error deleting signature: {ex.Message}");
            return false;
        }
    }
}
