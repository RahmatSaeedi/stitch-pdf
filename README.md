# Stitch PDF Converter & Merger

<div align="center">

![Stitch PDF Logo](wwwroot/icon-192.png)

**A powerful, privacy-first PDF manipulation tool that runs entirely in your browser**

[![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Blazor WebAssembly](https://img.shields.io/badge/Blazor-WebAssembly-512BD4?logo=blazor)](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor)
[![PWA](https://img.shields.io/badge/PWA-enabled-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![No Server Required](https://img.shields.io/badge/server-not%20required-success)](https://github.com)

[Features](#-features) • [Usage](#-usage) • [Privacy](#-privacy--security)

</div>

---

## 🎯 Overview

**Stitch PDF** is a modern, feature-rich PDF manipulation tool built as a Progressive Web App (PWA) using Blazor WebAssembly. Unlike traditional PDF tools, Stitch processes everything **100% client-side** — your files never leave your browser, ensuring complete privacy and security.

Whether you need to merge PDFs, convert documents to PDF, add signatures, extract text with OCR, or apply watermarks, Stitch does it all without requiring an internet connection or server uploads.

### Why Stitch?

- **🔒 Privacy First** - All processing happens in your browser. Your files stay on your device.
- **⚡ Lightning Fast** - No server round-trips. Process files instantly.
- **📴 Works Offline** - Install as a PWA and use without internet connectivity.
- **💰 Completely Free** - No subscriptions, no uploads, no limits.
- **🌍 Universal Access** - Works on any device with a modern browser.
- **🎨 Beautiful UI** - Modern Material Design interface with dark mode support.

---

## ✨ Features

### 🔧 Core Functionality

#### PDF Operations
- **Merge PDFs** - Combine multiple PDF files into a single document
- **Split PDFs** - Extract specific pages or split into multiple files
- **Delete Pages** - Remove unwanted pages from PDFs
- **Rotate Pages** - Rotate individual pages or entire documents (90°, 180°, 270°)
- **Reorder Pages** - Drag and drop to rearrange page order
- **Compress PDFs** - Reduce file size with adjustable quality settings
- **Password Protection** - Encrypt PDFs with user and owner passwords
- **Edit Metadata** - Update title, author, subject, keywords, and dates

#### Document Conversion
Convert the following formats to PDF:
- **Office Documents**: DOCX, XLSX, XLS, ODS
- **Raster Images**: PNG, JPG, JPEG, WebP, GIF, BMP, TIFF, AVIF, HEIC/HEIF
- **Vector Graphics**: SVG
- **Text Formats**: TXT, Markdown, CSV, HTML, XML, JSON
- **Archives**: ZIP (extracts and processes all contained files)
- **E-Books**: EPUB

#### Image Export
- **PDF to Images** - Convert PDF pages to PNG or JPG format
- **Batch Export** - Export all pages or selected ranges
- **Quality Control** - Adjustable image quality and resolution

### 🚀 Advanced Features

#### ✍️ E-Signature
- **Draw Signatures** - Freehand drawing with mouse or touch
- **Type Signatures** - Multiple font styles and sizes
- **Upload Signatures** - Use existing signature images
- **Signature Library** - Save and reuse signatures (stored locally)
- **Flexible Placement** - Position signatures anywhere on any page

#### 🔍 OCR (Optical Character Recognition)
- **Text Extraction** - Extract text from images and scanned PDFs using Tesseract.js
- **110+ Languages** - Support for English, Spanish, French, German, Chinese, Japanese, Arabic, and more
- **Searchable PDFs** - Add invisible text layers to make scanned documents searchable
- **Copy to Clipboard** - Easily copy extracted text
- **Confidence Scores** - See OCR accuracy ratings

#### 🏷️ QR Codes & Barcodes
- **QR Code Generation** - Create QR codes from URLs, text, or contact information
- **Barcode Support** - Generate CODE128, CODE39, EAN-13, UPC, ITF-14 barcodes
- **PDF Embedding** - Place codes on specific pages with custom positioning
- **Live Preview** - See codes before embedding
- **Customization** - Adjust size, position, and styling

#### 🎨 Watermarking & Branding
- **Text Watermarks** - Add custom text with font, size, and color options
- **Image Watermarks** - Overlay images or logos
- **Flexible Positioning** - Place watermarks anywhere on the page
- **Opacity Control** - Adjust transparency for subtle branding
- **Rotation** - Angle watermarks diagonally or at custom degrees

#### 📄 Page Numbering
- **Headers & Footers** - Add page numbers, headers, and footers
- **Custom Formats** - "Page X of Y", "X/Y", numbered lists, etc.
- **Positioning** - Top, bottom, left, right, or centered
- **Font Customization** - Choose fonts, sizes, and colors
- **Page Ranges** - Apply to specific pages or entire document

#### 📱 Document Scanning
- **Camera Integration** - Scan documents directly from your device camera
- **Auto-Crop** - Automatically detect document edges
- **Multi-Page Scans** - Scan multiple pages in sequence
- **Instant PDF** - Convert scans to PDF immediately

### 🎯 User Experience

- **Drag & Drop Interface** - Intuitive file upload with visual feedback
- **Live Thumbnails** - Preview all pages before processing
- **Real-time Progress** - See processing status for large operations
- **Recent Files** - Quick access to previously processed files
- **Templates** - Pre-configured document templates for common tasks
- **Batch Operations** - Process multiple files with the same settings
- **Keyboard Shortcuts** - Power user shortcuts for common actions
- **Touch Gestures** - Mobile-optimized touch controls
- **Dark Mode** - Easy on the eyes with automatic theme switching
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile

### ⚙️ Performance & Optimization

- **Memory Monitoring** - Track browser memory usage during operations
- **Chunked Processing** - Handle large files efficiently
- **Web Workers** - Background processing for smooth UI
- **Performance Settings** - Tune memory usage and processing speed
- **File Validation** - Comprehensive type and size validation
- **Error Recovery** - Graceful handling of processing errors

---

## 📦 Usage

### Option 1: Use Online (Recommended)

Simply visit your [deployed URL](https://rahmatsaeedi.github.io/stitch-pdf/) and start using Stitch immediately. No installation required!

### Option 2: Install as PWA

1. Visit the web app in your browser
2. Click the **Install** button in the address bar (or use the in-app install prompt)
3. The app will be installed on your device and available offline

---

## 🎓 Usage

### Basic Workflow

1. **Upload Files**
   - Drag and drop files onto the upload zone
   - Click to browse and select files
   - Or paste images from clipboard

2. **Arrange & Configure**
   - Drag files to reorder them
   - Rotate individual pages
   - Select specific pages from PDFs
   - Configure conversion options (page size, margins, orientation)

3. **Apply Advanced Features** (Optional)
   - Add signatures
   - Extract text with OCR
   - Add watermarks or page numbers
   - Embed QR codes or barcodes
   - Split or compress PDFs

4. **Process & Download**
   - Click "Merge to PDF" or appropriate action button
   - Wait for processing (with real-time progress)
   - Download your processed file

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + O` | Open file picker |
| `Ctrl/Cmd + S` | Download result |
| `Ctrl/Cmd + M` | Start merge |
| `Ctrl/Cmd + D` | Toggle dark mode |
| `Delete` | Remove selected file |
| `Esc` | Close dialogs |

### Tips & Tricks

- **Large Files**: For files over 100MB, enable chunked processing in Performance Settings
- **Mobile Scanning**: Use the camera scanner for quick document digitization
- **Reusable Signatures**: Save your signature once and reuse it across documents
- **Templates**: Create templates for frequently used document configurations
- **Batch Mode**: Process multiple files with the same watermark or page numbers
- **ZIP Archives**: Upload a ZIP file to automatically extract and process all files inside

---

## 🛠️ Technology Stack

### Frontend Framework
- **[Blazor WebAssembly](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor)** - .NET 10 running in the browser via WebAssembly
- **[MudBlazor](https://mudblazor.com/)** - Material Design component library (v8.15.0)
- **C#** - Strongly-typed, modern language for UI logic

### PDF Processing
- **[pdf-lib](https://pdf-lib.js.org/)** - Core PDF creation and manipulation
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - Mozilla's PDF rendering engine for thumbnails
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** - OCR with 110+ language support

### Additional Libraries
- **[Signature Pad](https://github.com/szimek/signature_pad)** - HTML5 canvas-based signature drawing
- **[JsBarcode](https://github.com/lindell/JsBarcode)** - Barcode generation
- **[qrcode.js](https://davidshimjs.github.io/qrcodejs/)** - QR code generation
- **[Mammoth.js](https://github.com/mwilliamson/mammoth.js)** - DOCX to HTML conversion
- **[XLSX.js](https://sheetjs.com/)** - Excel file processing
- **[heic2any](https://github.com/alexcorvi/heic2any)** - HEIC/HEIF image conversion (iPhone photos)
- **[JSZip](https://stuk.github.io/jszip/)** - ZIP archive handling
- **[Sortable.js](https://sortablejs.github.io/Sortable/)** - Drag-and-drop functionality
- **[Marked.js](https://marked.js.org/)** - Markdown parsing
- **[PapaParse](https://www.papaparse.com/)** - CSV parsing
- **[html2canvas](https://html2canvas.hertzen.com/)** - HTML to image conversion

### Architecture
- **Service-Oriented**: Clean separation of concerns with dependency injection
- **JavaScript Interop**: Seamless C#/JavaScript integration for optimal performance
- **Web Workers**: Background processing for responsive UI
- **Progressive Web App**: Service workers for offline support and installation

---

## 📐 Architecture

### Project Structure

```
PdfMerger.Client/
├── Components/
│   └── Shared/              # 28 Reusable Razor components
│       ├── FileUploadZone.razor
│       ├── SignatureDialog.razor
│       ├── OcrDialog.razor
│       ├── QRBarcodeDialog.razor
│       ├── WatermarkDialog.razor
│       └── [23 more components]
├── Models/                  # Data models and DTOs
│   ├── FileItem.cs
│   ├── ProcessingResult.cs
│   ├── PdfConversionOptions.cs
│   └── [10+ more models]
├── Services/                # Business logic and PDF operations
│   ├── IPdfService.cs / PdfService.cs
│   ├── IAdvancedPdfService.cs / AdvancedPdfService.cs
│   ├── ISignatureService.cs / SignatureService.cs
│   ├── IOcrService.cs / OcrService.cs
│   └── [15+ more services]
├── Pages/
│   └── Home.razor           # Main application page
├── wwwroot/
│   ├── js/                  # JavaScript interop modules (15+ files)
│   ├── lib/                 # Third-party libraries (20+ files)
│   ├── css/                 # Stylesheets
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # Service worker for offline support
│   └── index.html           # Entry point
└── Program.cs               # App configuration and DI setup
```

### Service Layer

All functionality is organized into focused services:

- **IPdfService** - Core PDF merge and conversion
- **IAdvancedPdfService** - Split, compress, watermark, page numbers
- **ISignatureService** - E-signature creation and management
- **IOcrService** - Text extraction with Tesseract.js
- **IFileValidationService** - File type and size validation
- **IDocumentConversionService** - DOCX, XLSX, Markdown conversion
- **IRecentFilesService** - Recent files history
- **IBatchOperationsService** - Batch processing workflows
- **ITemplateService** - Document template management
- **IThemeService** - Dark/light theme switching
- **IMemoryMonitorService** - Browser memory tracking
- **IWebWorkerService** - Web Worker management

---

## 🔒 Privacy & Security

### Your Data is Safe

- **100% Client-Side Processing**: All file operations happen in your browser using WebAssembly and JavaScript
- **No Server Uploads**: Your files never leave your device
- **No Data Collection**: We don't track, store, or analyze your files
- **No Account Required**: No sign-ups, no personal information needed
- **Open Source**: Full transparency - inspect the code yourself

### Security Features

- **HTTPS Only**: Enforced in production environments
- **Password Protection**: AES encryption for sensitive PDFs
- **Local Storage Only**: Signatures and templates stored in browser localStorage
- **No External APIs**: All functionality is self-contained
- **Content Security Policy**: Strict CSP headers prevent XSS attacks

### Privacy Best Practices

- **Clear Recent Files**: Regularly clear your recent files history
- **Incognito Mode**: Use private browsing for sensitive documents
- **Self-Host**: Deploy your own instance for complete control

---

## 📊 File Limits

Current configuration (adjustable in `FileValidationService.cs`):

- **Maximum Individual File Size**: 1 GB
- **Maximum Total Upload Size**: 4 GB
- **Recommended File Size**: Under 100 MB for optimal performance
- **Pages per PDF**: Unlimited (memory permitting)

*For large files, enable chunked processing in Performance Settings*

**Note**: The default README mentions 50MB/200MB limits, but the codebase supports up to 1GB/4GB. Adjust `MaxFileSizeBytes` and `MaxTotalSizeBytes` in `Services/FileValidationService.cs` as needed.

---

## 🗺️ Roadmap

### Completed Features ✅

- [x] Core PDF merge and conversion
- [x] E-signature support with drawing, typing, and uploading
- [x] OCR text extraction with 110+ languages
- [x] QR codes and barcodes generation
- [x] Watermarking (text and image)
- [x] Page numbering with custom formats
- [x] PDF splitting and page extraction
- [x] Password protection and encryption
- [x] PDF compression
- [x] PWA with offline support
- [x] Dark mode
- [x] Recent files history
- [x] Batch operations
- [x] Document templates
- [x] Camera scanning
- [x] Performance monitoring and tuning

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements, your help is appreciated.

### Development Guidelines

- **Code Style**: Follow C# and JavaScript best practices
- **Comments**: Document complex logic and public APIs
- **Testing**: Ensure all features work in Chrome, Firefox, Safari, and Edge
- **Accessibility**: Maintain WCAG 2.1 AA compliance
- **Performance**: Test with large files (500MB+)

### Reporting Bugs

Found a bug? Please open an issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- File types and sizes involved

---


## 🙏 Acknowledgments

This project is built on the shoulders of giants. Special thanks to:

- **[pdf-lib](https://pdf-lib.js.org/)** - Andrew Dillon for the excellent PDF library
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - Mozilla for PDF rendering
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** - Tesseract OCR team
- **[MudBlazor](https://mudblazor.com/)** - MudBlazor team for beautiful components
- **[Blazor Team](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor)** - Microsoft for Blazor WebAssembly
- All open-source library authors and contributors

---

## 📞 Support

### Get Help

- **Issues**: [Report a Bug](https://github.com/yourusername/PDF-Merger/issues)
- **Discussions**: [Community Forum](https://github.com/yourusername/PDF-Merger/discussions)

### Frequently Asked Questions

**Q: Is my data really private?**
A: Yes! All processing happens in your browser. Your files never leave your device.

**Q: Do I need internet to use this?**
A: After the first visit, you can install it as a PWA and use it completely offline.

**Q: What's the maximum file size?**
A: Individual files up to 1GB, total upload up to 4GB. For best performance, keep files under 100MB.

**Q: Which browsers are supported?**
A: All modern browsers: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ (desktop and mobile).

**Q: Can I use this for commercial purposes?**
A: Yes! The MIT license allows commercial use.

**Q: How do I report a security vulnerability?**
A: Please create a private security advisory on GitHub rather than a public issue.

---

## 🌟 Support This Project

If you find this project useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🔀 Contributing code improvements
- 📢 Sharing with others

---

<div align="center">

**Made with ❤️ using Blazor WebAssembly**

[⬆ Back to Top](#stitch-pdf-converter--merger)

</div>
