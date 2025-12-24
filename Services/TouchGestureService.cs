using Microsoft.JSInterop;

namespace PdfMerger.Client.Services;

public interface ITouchGestureService
{
    event Action<string>? OnSwipe;
    event Action? OnTap;
    event Action? OnLongPress;
    event Action<double>? OnPinch;
    Task<bool> InitializeAsync(string elementId);
    Task DisposeAsync(string elementId);
    Task<bool> IsTouchDeviceAsync();
}

public class TouchGestureService : ITouchGestureService
{
    private readonly IJSRuntime _jsRuntime;
    private IJSObjectReference? _module;
    private DotNetObjectReference<TouchGestureService>? _dotNetRef;

    public event Action<string>? OnSwipe;
    public event Action? OnTap;
    public event Action? OnLongPress;
    public event Action<double>? OnPinch;

    public TouchGestureService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<bool> InitializeAsync(string elementId)
    {
        try
        {
            _module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/touchGestures.js");
            _dotNetRef = DotNetObjectReference.Create(this);
            return await _module.InvokeAsync<bool>("initializeTouchGestures", elementId, _dotNetRef);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error initializing touch gestures: {ex.Message}");
            return false;
        }
    }

    [JSInvokable("OnSwipe")]
    public void HandleSwipeGesture(string direction)
    {
        OnSwipe?.Invoke(direction);
    }

    [JSInvokable("OnTap")]
    public void HandleTapGesture()
    {
        OnTap?.Invoke();
    }

    [JSInvokable("OnLongPress")]
    public void HandleLongPressGesture()
    {
        OnLongPress?.Invoke();
    }

    [JSInvokable("OnPinch")]
    public void HandlePinchGesture(double scale)
    {
        OnPinch?.Invoke(scale);
    }

    public async Task<bool> IsTouchDeviceAsync()
    {
        if (_module == null)
        {
            try
            {
                _module = await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./js/touchGestures.js");
            }
            catch
            {
                return false;
            }
        }

        try
        {
            return await _module.InvokeAsync<bool>("isTouchDevice");
        }
        catch
        {
            return false;
        }
    }

    public async Task DisposeAsync(string elementId)
    {
        if (_module != null)
        {
            try
            {
                await _module.InvokeVoidAsync("disposeTouchGestures", elementId);
            }
            catch { }
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_module != null)
        {
            try
            {
                await _module.InvokeVoidAsync("disposeAllTouchGestures");
                await _module.DisposeAsync();
            }
            catch { }
        }
        _dotNetRef?.Dispose();
    }
}
