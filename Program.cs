using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using MudBlazor.Services;
using PdfMerger.Client;
using PdfMerger.Client.Services;
using PdfMerger.Client.Services.Conversion;
using PdfMerger.Client.Services.Utilities;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddMudServices();

// Register application services
builder.Services.AddScoped<IFileValidationService, FileValidationService>();
builder.Services.AddScoped<IPdfService, PdfService>();
builder.Services.AddScoped<IDocumentConversionService, DocxConversionService>();
builder.Services.AddScoped<IMemoryMonitorService, MemoryMonitorService>();
builder.Services.AddScoped<IChunkedProcessorService, ChunkedProcessorService>();

// Register new advanced services
builder.Services.AddScoped<ISignatureService, SignatureService>();
builder.Services.AddScoped<IOcrService, OcrService>();
builder.Services.AddScoped<IAdvancedPdfService, AdvancedPdfService>(); // Includes QR/Barcode via JavaScript

// Register theme service
builder.Services.AddScoped<IThemeService, ThemeService>();

// Register keyboard shortcut service
builder.Services.AddScoped<IKeyboardShortcutService, KeyboardShortcutService>();

// Register recent files service
builder.Services.AddScoped<IRecentFilesService, RecentFilesService>();

// Register touch gesture service
builder.Services.AddScoped<ITouchGestureService, TouchGestureService>();

// Register batch operations service
builder.Services.AddScoped<IBatchOperationsService, BatchOperationsService>();

// Register template service
builder.Services.AddScoped<ITemplateService, TemplateService>();

// Register web worker service for performance optimization
builder.Services.AddScoped<IWebWorkerService, WebWorkerService>();

await builder.Build().RunAsync();
