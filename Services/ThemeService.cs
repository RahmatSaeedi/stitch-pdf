using Microsoft.JSInterop;

namespace PdfMerger.Client.Services;

public interface IThemeService
{
    event Action? OnThemeChanged;
    Task<bool> GetIsDarkModeAsync();
    Task SetDarkModeAsync(bool isDark);
    Task ToggleThemeAsync();
}

public class ThemeService : IThemeService
{
    private readonly IJSRuntime _jsRuntime;
    private bool _isDarkMode;

    public event Action? OnThemeChanged;

    public ThemeService(IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
    }

    public async Task<bool> GetIsDarkModeAsync()
    {
        try
        {
            var storedTheme = await _jsRuntime.InvokeAsync<string?>("localStorage.getItem", "theme");

            if (storedTheme != null)
            {
                _isDarkMode = storedTheme == "dark";
            }
            else
            {
                // Check system preference
                try
                {
                    _isDarkMode = await _jsRuntime.InvokeAsync<bool>("eval", "window.matchMedia('(prefers-color-scheme: dark)').matches");
                }
                catch
                {
                    _isDarkMode = false;
                }
            }
        }
        catch
        {
            _isDarkMode = false;
        }

        return _isDarkMode;
    }

    public async Task SetDarkModeAsync(bool isDark)
    {
        _isDarkMode = isDark;
        await _jsRuntime.InvokeVoidAsync("localStorage.setItem", "theme", isDark ? "dark" : "light");

        // Apply dark mode to body and main content elements
        try
        {
            if (isDark)
            {
                await _jsRuntime.InvokeVoidAsync("eval",
                    "document.body.style.backgroundColor = '#121212'; " +
                    "document.body.style.color = '#e0e0e0'; " +
                    "const mainContent = document.querySelector('.mud-main-content'); " +
                    "if (mainContent) { mainContent.style.backgroundColor = '#1a1a1a'; }");
            }
            else
            {
                await _jsRuntime.InvokeVoidAsync("eval",
                    "document.body.style.backgroundColor = '#ffffff'; " +
                    "document.body.style.color = '#000000'; " +
                    "const mainContent = document.querySelector('.mud-main-content'); " +
                    "if (mainContent) { mainContent.style.backgroundColor = '#ffffff'; }");
            }
        }
        catch { }

        OnThemeChanged?.Invoke();
    }

    public async Task ToggleThemeAsync()
    {
        await SetDarkModeAsync(!_isDarkMode);
    }
}
