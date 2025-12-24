using Microsoft.JSInterop;

namespace PdfMerger.Client.Services;

public interface IKeyboardShortcutService
{
    event Action<string>? OnShortcutPressed;
    Task InitializeAsync();
    Task DisposeAsync();
}

public class KeyboardShortcutService : IKeyboardShortcutService
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _module;
    private DotNetObjectReference<KeyboardShortcutService>? _dotNetRef;

    public event Action<string>? OnShortcutPressed;

    public KeyboardShortcutService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task InitializeAsync()
    {
        _module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/keyboardShortcuts.js");
        _dotNetRef = DotNetObjectReference.Create(this);
        await _module.InvokeVoidAsync("initializeKeyboardShortcuts", _dotNetRef);
    }

    [JSInvokable]
    public void HandleShortcut(string shortcutName)
    {
        OnShortcutPressed?.Invoke(shortcutName);
    }

    public async Task DisposeAsync()
    {
        if (_module != null)
        {
            await _module.InvokeVoidAsync("disposeKeyboardShortcuts");
            await _module.DisposeAsync();
        }
        _dotNetRef?.Dispose();
    }
}
