let pdfLib;
let pdfjsLib;
let JSZip;
let heic2any;
let marked;
let Papa;
let html2canvas;
let UTIF;
let mammoth;
let XLSX;

export async function initialize() {
    try {
        pdfLib = window.PDFLib;
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        JSZip = window.JSZip;
        heic2any = window.heic2any;
        marked = window.marked;
        Papa = window.Papa;
        html2canvas = window.html2canvas;
        UTIF = window.UTIF;
        mammoth = window.mammoth;
        XLSX = window.XLSX;

        if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdf.worker.min.js';

            // Suppress warnings about font/glyph issues - PDF.js handles these automatically
            // Only show actual errors
            pdfjsLib.GlobalWorkerOptions.verbosity = 0; // 0 = ERRORS only, 1 = WARNINGS, 5 = INFOS
        }

        return pdfLib !== undefined && pdfjsLib !== undefined;
    } catch (error) {
        console.error('Failed to initialize PDF libraries:', error);
        return false;
    }
}

export async function getPageCount(pdfBytes) {
    try {
        if (!pdfLib) await initialize();

        const { PDFDocument } = pdfLib;
        const uint8Array = new Uint8Array(pdfBytes);
        const pdfDoc = await PDFDocument.load(uint8Array, { ignoreEncryption: true });

        return pdfDoc.getPageCount();
    } catch (error) {
        console.error('Error getting page count:', error);
        throw error;
    }
}

// Helper function to get page dimensions based on page size and orientation
function getPageDimensions(pageSize, orientation) {
    // Standard page sizes in points (1 point = 1/72 inch)
    const sizes = {
        'A4': [595.28, 841.89],      // 210 × 297 mm
        'A3': [841.89, 1190.55],     // 297 × 420 mm
        'A5': [419.53, 595.28],      // 148 × 210 mm
        'Letter': [612, 792],         // 8.5 × 11 in
        'Legal': [612, 1008],         // 8.5 × 14 in
        'Tabloid': [792, 1224]        // 11 × 17 in
    };

    let [width, height] = sizes[pageSize] || sizes['A4'];

    // Swap dimensions if landscape
    if (orientation === 'Landscape') {
        [width, height] = [height, width];
    }

    return { width, height };
}

// Helper function to normalize all pages to the same size
async function normalizePageSizes(pdfDoc, settings) {
    if (!settings || !settings.normalizePageSizes) return;

    const targetDimensions = getPageDimensions(
        settings.pageSize || 'A4',
        settings.orientation || 'Portrait'
    );

    const pages = pdfDoc.getPages();
    const pagesToReplace = [];

    // First pass: identify and embed pages that need resizing
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Get the page's current size and rotation
        const pageSize = page.getSize();
        const rotation = page.getRotation();
        const rotationAngle = rotation.angle || 0;

        // Normalize rotation to 0-359 degrees (pdf-lib can return values like 450°)
        const normalizedRotation = ((rotationAngle % 360) + 360) % 360;

        // Get dimensions accounting for rotation
        // If rotated 90° or 270°, the visual dimensions are swapped
        let visualWidth, visualHeight;
        if (normalizedRotation === 90 || normalizedRotation === 270) {
            visualWidth = pageSize.height;
            visualHeight = pageSize.width;
        } else {
            visualWidth = pageSize.width;
            visualHeight = pageSize.height;
        }

        // Skip if page already matches target size (within 1 point tolerance) and has no rotation
        if (Math.abs(visualWidth - targetDimensions.width) < 1 &&
            Math.abs(visualHeight - targetDimensions.height) < 1 &&
            normalizedRotation === 0) {
            continue;
        }

        // Embed the page - this captures the page with its rotation
        const embeddedPage = await pdfDoc.embedPage(page);

        // Use minimal margins for page normalization (scanned docs already have their own margins)
        // Use smaller margins than the document settings to maximize content area
        const margins = { top: 10, right: 10, bottom: 10, left: 10 };

        // For pages that will be counter-rotated, we need to use the ORIGINAL dimensions
        // because after counter-rotation, the dimensions will swap back
        let scaleWidth, scaleHeight;
        if (normalizedRotation === 90 || normalizedRotation === 270) {
            // For 90/270 rotation, use original page size (will be swapped after counter-rotation)
            scaleWidth = pageSize.width;
            scaleHeight = pageSize.height;
        } else {
            // For 0/180 rotation, use visual dimensions
            scaleWidth = visualWidth;
            scaleHeight = visualHeight;
        }

        const scaleX = (targetDimensions.width - margins.left - margins.right) / scaleWidth;
        const scaleY = (targetDimensions.height - margins.top - margins.bottom) / scaleHeight;
        const scale = Math.min(scaleX, scaleY);

        // Calculate scaled dimensions (these will be used for positioning)
        const scaledWidth = scaleWidth * scale;
        const scaledHeight = scaleHeight * scale;
        const x = (targetDimensions.width - scaledWidth) / 2;
        const y = (targetDimensions.height - scaledHeight) / 2;

        pagesToReplace.push({
            index: i,
            embeddedPage,
            x,
            y,
            scaledWidth,
            scaledHeight,
            originalRotation: normalizedRotation
        });
    }

    // Second pass: replace pages (in reverse order to maintain indices)
    for (let i = pagesToReplace.length - 1; i >= 0; i--) {
        const { index, embeddedPage, x, y, scaledWidth, scaledHeight, originalRotation } = pagesToReplace[i];

        // Create a new blank page with the target size
        const newPage = pdfDoc.insertPage(index, [targetDimensions.width, targetDimensions.height]);

        // Calculate draw options with rotation correction
        // We need to counter the original rotation to make content upright
        const drawOptions = {
            x: x,
            y: y,
            width: scaledWidth,
            height: scaledHeight
        };

        // If the original page had rotation, apply INVERSE rotation to make it upright
        if (originalRotation !== 0) {
            // Apply counter-rotation: -originalRotation
            drawOptions.rotate = pdfLib.degrees(-originalRotation);

            // Rotation in pdf-lib happens around bottom-left (0,0)
            // We need to adjust position based on rotation angle
            const centerX = targetDimensions.width / 2;
            const centerY = targetDimensions.height / 2;

            if (originalRotation === 90) {
                // -90° rotation: content rotates counter-clockwise
                // Position so rotated content is centered
                drawOptions.x = centerX - (scaledHeight / 2);
                drawOptions.y = centerY + (scaledWidth / 2);
            } else if (originalRotation === 270) {
                // -270° rotation (same as +90°): content rotates clockwise
                drawOptions.x = centerX + (scaledHeight / 2);
                drawOptions.y = centerY - (scaledWidth / 2);
            } else if (originalRotation === 180) {
                // -180° rotation: content flips
                drawOptions.x = centerX + (scaledWidth / 2);
                drawOptions.y = centerY + (scaledHeight / 2);
            }
        }

        newPage.drawPage(embeddedPage, drawOptions);

        // Remove the old page (now at index + 1 because we inserted before it)
        pdfDoc.removePage(index + 1);
    }
}

// Helper function to add page numbers to all pages
async function addPageNumbers(pdfDoc, settings) {
    if (!settings || !settings.addPageNumbers) return;

    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    const { rgb } = pdfLib;
    const fontSize = 10;
    const textColor = rgb(0, 0, 0);

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // Format page number
        let text = settings.numberFormat || 'Page {0}';
        text = text.replace('{0}', (i + 1).toString());
        text = text.replace('{1}', totalPages.toString());

        // Calculate position based on settings
        let x, y;
        const margin = 36; // 0.5 inch

        switch (settings.numberPosition) {
            case 'TopLeft':
                x = margin;
                y = height - margin;
                break;
            case 'TopCenter':
                x = width / 2;
                y = height - margin;
                break;
            case 'TopRight':
                x = width - margin;
                y = height - margin;
                break;
            case 'BottomLeft':
                x = margin;
                y = margin;
                break;
            case 'BottomCenter':
                x = width / 2;
                y = margin;
                break;
            case 'BottomRight':
            default:
                x = width - margin;
                y = margin;
                break;
        }

        // Draw page number
        page.drawText(text, {
            x,
            y,
            size: fontSize,
            color: textColor,
        });
    }
}

// Helper function to yield control back to the browser to prevent UI freezing
async function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

export async function mergePdfs(filesData, progressCallback, conversionSettings) {
    try {
        if (!pdfLib) await initialize();

        const { PDFDocument } = pdfLib;
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < filesData.length; i++) {
            // Yield to UI before processing each file to prevent freezing
            await yieldToUI();

            const fileData = filesData[i];
            const uint8Array = new Uint8Array(fileData.bytes);

            // Determine effective settings: per-file overrides take precedence over global settings
            const effectiveSettings = fileData.conversionOverrides || conversionSettings || {};

            // File-level rotation (for images and documents)
            const fileRotation = fileData.rotation || 0;

            if (fileData.type === 'application/pdf') {
                try {
                    // Load PDF with ignoreEncryption to handle password-protected/restricted PDFs
                    const pdf = await PDFDocument.load(uint8Array, { ignoreEncryption: true });

                    // Determine which pages to include
                    let pageIndices;
                    if (fileData.selectedPages && fileData.selectedPages.length > 0) {
                        // Use selected pages (convert from 1-indexed to 0-indexed)
                        pageIndices = fileData.selectedPages.map(p => p - 1);
                    } else {
                        // Use all pages
                        pageIndices = pdf.getPageIndices();
                    }

                    // Copy the pages
                    const pages = await mergedPdf.copyPages(pdf, pageIndices);

                    // Add pages and apply rotations if specified
                    pages.forEach((page, idx) => {
                        const originalPageIndex = pageIndices[idx];
                        const currentRotation = page.getRotation().angle || 0;
                        let totalRotation = currentRotation;

                        // Apply file-level rotation (from rotate buttons in file card)
                        if (fileRotation !== 0) {
                            totalRotation += fileRotation;
                        }

                        // Apply page-specific rotation (from page selector dialog)
                        if (fileData.pageRotations && fileData.pageRotations[originalPageIndex]) {
                            totalRotation += fileData.pageRotations[originalPageIndex];
                        }

                        // Set the combined rotation if any rotation was applied
                        if (totalRotation !== currentRotation) {
                            page.setRotation(pdfLib.degrees(totalRotation));
                        }

                        mergedPdf.addPage(page);
                    });
                } catch (pdfError) {
                    // Enhanced error message for protected/encrypted PDFs
                    const errorMsg = pdfError.message || pdfError.toString();

                    // Check if it's a protection/encryption issue
                    if (errorMsg.includes('Expected instance of') ||
                        errorMsg.includes('encryption') ||
                        errorMsg.includes('password') ||
                        errorMsg.includes('Pages')) {
                        throw new Error(
                            `PDF file at position ${i + 1} appears to be heavily protected or encrypted and cannot be processed. ` +
                            `This PDF may have restrictions like "document assembly not allowed" or other security settings. ` +
                            `Please try removing the protection using a PDF editor (like Adobe Acrobat) before merging, ` +
                            `or remove this file from the merge list.`
                        );
                    }

                    // Re-throw other errors with file position info
                    throw new Error(`Error processing PDF file at position ${i + 1}: ${errorMsg}`);
                }
            } else if (fileData.type.startsWith('image/')) {
                await addImageAsPdf(mergedPdf, uint8Array, fileData.type, effectiveSettings, fileRotation);
            } else if (fileData.type === 'text/plain') {
                await addTextAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'text/markdown') {
                await addMarkdownAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'text/csv') {
                await addCsvAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'text/html') {
                await addHtmlAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                await addDocxAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                await addXlsxAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'application/vnd.ms-excel') {
                await addXlsxAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'application/vnd.oasis.opendocument.spreadsheet') {
                await addXlsxAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'text/xml' || fileData.type === 'application/xml') {
                await addXmlAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'application/json' || fileData.type === 'text/json') {
                await addJsonAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            } else if (fileData.type === 'application/epub+zip') {
                await addEpubAsPdf(mergedPdf, uint8Array, effectiveSettings, fileRotation);
            }

            // Report progress
            const progress = Math.round(((i + 1) / filesData.length) * 100);
            if (progressCallback) {
                try {
                    await progressCallback.invokeMethodAsync('ReportProgress', progress);
                } catch (e) {
                    console.warn('Failed to report progress:', e);
                }
            }
        }

        // Normalize page sizes if enabled (before adding page numbers)
        if (conversionSettings) {
            await normalizePageSizes(mergedPdf, conversionSettings);
        }

        // Add page numbers if enabled
        if (conversionSettings) {
            await addPageNumbers(mergedPdf, conversionSettings);
        }

        const pdfBytes = await mergedPdf.save();
        // Return Uint8Array directly instead of Array to handle large files (62+ files)
        // Blazor JSInterop can handle Uint8Array natively without size limits
        return pdfBytes;
    } catch (error) {
        console.error('Error merging PDFs:', error);
        throw error;
    }
}

async function addImageAsPdf(pdfDoc, imageBytes, mimeType, settings = {}, rotation = 0) {
    // Yield to UI before image processing
    await yieldToUI();

    let image;

    // Apply EXIF auto-rotation if enabled
    const shouldAutoRotate = settings.autoRotateFromExif !== false; // default to true

    // Handle native formats that pdf-lib supports directly
    if (mimeType === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        if (shouldAutoRotate) {
            // Convert to PNG with EXIF rotation applied
            const convertedPng = await convertImageToPngWithExif(imageBytes, mimeType);
            image = await pdfDoc.embedPng(convertedPng);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }
    } else if (mimeType === 'image/heic' || mimeType === 'image/heif') {
        // Convert HEIC/HEIF to PNG using heic2any
        const convertedPng = await convertHeicToPng(imageBytes);
        image = await pdfDoc.embedPng(convertedPng);
    } else if (mimeType === 'image/svg+xml') {
        // Convert SVG to PNG
        const convertedPng = await convertSvgToPng(imageBytes);
        image = await pdfDoc.embedPng(convertedPng);
    } else if (mimeType === 'image/tiff') {
        // Convert TIFF to PNG using UTIF
        const convertedPng = await convertTiffToPng(imageBytes);
        image = await pdfDoc.embedPng(convertedPng);
    } else if (mimeType === 'image/avif') {
        // Convert AVIF to PNG using canvas (browser has native support)
        const convertedPng = await convertImageToPng(imageBytes, mimeType);
        image = await pdfDoc.embedPng(convertedPng);
    } else {
        // For other formats (WebP, GIF, BMP), convert to PNG first using canvas
        const convertedPng = await convertImageToPng(imageBytes, mimeType);
        image = await pdfDoc.embedPng(convertedPng);
    }

    // Yield after image embedding
    await yieldToUI();

    // Determine page size based on settings
    const cropMode = settings.cropMode || 'None';
    let pageWidth, pageHeight;
    let imageX, imageY, imageWidth, imageHeight;

    if (cropMode === 'None') {
        // Use image's original dimensions
        pageWidth = image.width;
        pageHeight = image.height;
        imageX = 0;
        imageY = 0;
        imageWidth = image.width;
        imageHeight = image.height;
    } else {
        // Use configured page size and orientation
        const pageDimensions = getPageDimensions(
            settings.pageSize || 'A4',
            settings.orientation || 'Portrait'
        );
        pageWidth = pageDimensions.width;
        pageHeight = pageDimensions.height;

        // Calculate image placement based on crop mode
        const imageAspect = image.width / image.height;
        const pageAspect = pageWidth / pageHeight;

        if (cropMode === 'Fit') {
            // Fit: preserve aspect ratio, letterbox/pillarbox if needed
            if (imageAspect > pageAspect) {
                // Image is wider - fit to width
                imageWidth = pageWidth;
                imageHeight = pageWidth / imageAspect;
                imageX = 0;
                imageY = (pageHeight - imageHeight) / 2;
            } else {
                // Image is taller - fit to height
                imageHeight = pageHeight;
                imageWidth = pageHeight * imageAspect;
                imageX = (pageWidth - imageWidth) / 2;
                imageY = 0;
            }
        } else if (cropMode === 'Fill') {
            // Fill: preserve aspect ratio, crop edges if needed
            if (imageAspect > pageAspect) {
                // Image is wider - fit to height, crop width
                imageHeight = pageHeight;
                imageWidth = pageHeight * imageAspect;
                imageX = -(imageWidth - pageWidth) / 2;
                imageY = 0;
            } else {
                // Image is taller - fit to width, crop height
                imageWidth = pageWidth;
                imageHeight = pageWidth / imageAspect;
                imageX = 0;
                imageY = -(imageHeight - pageHeight) / 2;
            }
        } else if (cropMode === 'Stretch') {
            // Stretch: ignore aspect ratio, fill entire page
            imageX = 0;
            imageY = 0;
            imageWidth = pageWidth;
            imageHeight = pageHeight;
        }
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
        x: imageX,
        y: imageY,
        width: imageWidth,
        height: imageHeight,
    });

    // Apply file-level rotation if specified
    if (rotation !== 0) {
        page.setRotation(pdfLib.degrees(rotation));
    }
}

async function convertImageToPng(imageBytes, mimeType) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([imageBytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                blob.arrayBuffer().then(buffer => {
                    URL.revokeObjectURL(url);
                    resolve(new Uint8Array(buffer));
                });
            }, 'image/png');
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${mimeType}`));
        };

        img.src = url;
    });
}

async function convertImageToPngWithExif(imageBytes, mimeType) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([imageBytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            // Read EXIF orientation (if available)
            // EXIF orientation values:
            // 1 = normal, 2 = flip horizontal, 3 = rotate 180, 4 = flip vertical
            // 5 = rotate 90 CW + flip horizontal, 6 = rotate 90 CW, 7 = rotate 90 CCW + flip horizontal, 8 = rotate 90 CCW

            // Try to read EXIF from image data
            getExifOrientation(imageBytes).then(orientation => {
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d', { willReadFrequently: true });
                let width = img.width;
                let height = img.height;

                // Determine canvas size and transformations based on orientation
                if (orientation >= 5 && orientation <= 8) {
                    // Orientations 5-8 require swapping width/height
                    canvas.width = height;
                    canvas.height = width;
                } else {
                    canvas.width = width;
                    canvas.height = height;
                }

                // Apply transformation based on orientation
                switch (orientation) {
                    case 2:
                        // Flip horizontal
                        ctx.translate(width, 0);
                        ctx.scale(-1, 1);
                        break;
                    case 3:
                        // Rotate 180
                        ctx.translate(width, height);
                        ctx.rotate(Math.PI);
                        break;
                    case 4:
                        // Flip vertical
                        ctx.translate(0, height);
                        ctx.scale(1, -1);
                        break;
                    case 5:
                        // Rotate 90 CW + flip horizontal
                        ctx.rotate(0.5 * Math.PI);
                        ctx.scale(1, -1);
                        break;
                    case 6:
                        // Rotate 90 CW
                        ctx.rotate(0.5 * Math.PI);
                        ctx.translate(0, -height);
                        break;
                    case 7:
                        // Rotate 90 CCW + flip horizontal
                        ctx.rotate(-0.5 * Math.PI);
                        ctx.translate(-width, height);
                        ctx.scale(1, -1);
                        break;
                    case 8:
                        // Rotate 90 CCW
                        ctx.rotate(-0.5 * Math.PI);
                        ctx.translate(-width, 0);
                        break;
                    default:
                        // Orientation 1 or undefined - no transformation
                        break;
                }

                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    blob.arrayBuffer().then(buffer => {
                        URL.revokeObjectURL(url);
                        resolve(new Uint8Array(buffer));
                    });
                }, 'image/png');
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${mimeType}`));
        };

        img.src = url;
    });
}

// Helper function to extract EXIF orientation from JPEG data
async function getExifOrientation(imageBytes) {
    try {
        const view = new DataView(imageBytes.buffer || imageBytes);

        // Check for JPEG signature
        if (view.getUint16(0, false) !== 0xFFD8) {
            return 1; // Not a JPEG, return normal orientation
        }

        let offset = 2;
        const length = view.byteLength;

        // Look for APP1 (EXIF) marker
        while (offset < length) {
            if (view.getUint16(offset, false) === 0xFFE1) {
                // Found APP1, check for EXIF identifier
                const exifOffset = offset + 4;
                const exifIdentifier = String.fromCharCode(
                    view.getUint8(exifOffset),
                    view.getUint8(exifOffset + 1),
                    view.getUint8(exifOffset + 2),
                    view.getUint8(exifOffset + 3)
                );

                if (exifIdentifier === 'Exif') {
                    // Read TIFF header
                    const tiffOffset = exifOffset + 6;
                    const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

                    // Read IFD0 offset
                    const ifd0Offset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);

                    // Read number of entries
                    const numEntries = view.getUint16(ifd0Offset, littleEndian);

                    // Search for orientation tag (0x0112)
                    for (let i = 0; i < numEntries; i++) {
                        const entryOffset = ifd0Offset + 2 + (i * 12);
                        const tag = view.getUint16(entryOffset, littleEndian);

                        if (tag === 0x0112) {
                            // Found orientation tag
                            return view.getUint16(entryOffset + 8, littleEndian);
                        }
                    }
                }
                break;
            }
            offset += 2 + view.getUint16(offset + 2, false);
        }
    } catch (error) {
        console.warn('Error reading EXIF orientation:', error);
    }

    return 1; // Default orientation
}

async function convertHeicToPng(imageBytes) {
    try {
        if (!heic2any) {
            throw new Error('heic2any library not loaded');
        }

        // Convert HEIC to PNG blob
        const blob = new Blob([imageBytes], { type: 'image/heic' });
        const convertedBlob = await heic2any({
            blob: blob,
            toType: 'image/png',
            quality: 0.9
        });

        // Convert blob to Uint8Array
        const arrayBuffer = await convertedBlob.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        console.error('Error converting HEIC:', error);
        throw new Error(`Failed to convert HEIC image: ${error.message}`);
    }
}

async function convertSvgToPng(svgBytes) {
    return new Promise((resolve, reject) => {
        try {
            // Decode SVG text
            const decoder = new TextDecoder('utf-8');
            const svgText = decoder.decode(svgBytes);

            // Create blob and URL
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Use SVG's viewBox or default size
                const width = img.width || 800;
                const height = img.height || 600;
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    blob.arrayBuffer().then(buffer => {
                        URL.revokeObjectURL(url);
                        resolve(new Uint8Array(buffer));
                    });
                }, 'image/png');
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG image'));
            };

            img.src = url;
        } catch (error) {
            reject(new Error(`Failed to convert SVG: ${error.message}`));
        }
    });
}

async function convertTiffToPng(tiffBytes) {
    try {
        if (!UTIF) {
            throw new Error('UTIF library not loaded');
        }

        // Decode TIFF
        const ifds = UTIF.decode(tiffBytes.buffer);

        // Get the first page
        if (!ifds || ifds.length === 0) {
            throw new Error('No images found in TIFF file');
        }

        // Decode the pixel data
        UTIF.decodeImage(tiffBytes.buffer, ifds[0]);
        const rgba = UTIF.toRGBA8(ifds[0]);

        // Create canvas and draw the RGBA data
        const canvas = document.createElement('canvas');
        canvas.width = ifds[0].width;
        canvas.height = ifds[0].height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Create ImageData from RGBA array
        const imageData = new ImageData(
            new Uint8ClampedArray(rgba),
            ifds[0].width,
            ifds[0].height
        );
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to PNG
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create PNG blob from TIFF'));
                    return;
                }
                blob.arrayBuffer().then(buffer => {
                    resolve(new Uint8Array(buffer));
                }).catch(reject);
            }, 'image/png');
        });
    } catch (error) {
        console.error('Error converting TIFF:', error);
        throw new Error(`Failed to convert TIFF image: ${error.message}`);
    }
}

async function addTextAsPdf(pdfDoc, textBytes, settings = {}, rotation = 0) {
    try {
        // Yield before processing
        await yieldToUI();

        // Decode text from bytes
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(textBytes);

        // Create a page with standard letter size
        const page = pdfDoc.addPage([612, 792]); // 8.5" x 11" in points
        const { width, height } = page.getSize();

        // Set up text styling
        const fontSize = 12;
        const lineHeight = fontSize * 1.2;
        const margin = 50;
        const maxWidth = width - (margin * 2);

        // Split text into lines
        const lines = text.split('\n');
        let y = height - margin;
        let lineCount = 0;

        for (const line of lines) {
            // Yield every 50 lines to prevent UI freezing on large documents
            if (++lineCount % 50 === 0) {
                await yieldToUI();
            }
            if (y < margin + lineHeight) {
                // Create new page if we run out of space
                const newPage = pdfDoc.addPage([612, 792]);
                y = newPage.getSize().height - margin;

                // Apply rotation to new page
                if (rotation !== 0) {
                    newPage.setRotation(pdfLib.degrees(rotation));
                }
            }

            // Wrap long lines
            const wrappedLines = wrapText(line, maxWidth, fontSize);

            for (const wrappedLine of wrappedLines) {
                if (y < margin + lineHeight) {
                    const newPage = pdfDoc.addPage([612, 792]);
                    y = newPage.getSize().height - margin;

                    // Apply rotation to new page
                    if (rotation !== 0) {
                        newPage.setRotation(pdfLib.degrees(rotation));
                    }
                }

                const currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
                currentPage.drawText(wrappedLine, {
                    x: margin,
                    y: y,
                    size: fontSize,
                });

                y -= lineHeight;
            }
        }

        // Apply rotation to first page
        if (rotation !== 0) {
            page.setRotation(pdfLib.degrees(rotation));
        }
    } catch (error) {
        console.error('Error converting text to PDF:', error);
        throw error;
    }
}

function wrapText(text, maxWidth, fontSize) {
    if (!text || text.length === 0) return [''];

    // Approximate character width (this is a rough estimate)
    const charWidth = fontSize * 0.6;
    const maxChars = Math.floor(maxWidth / charWidth);

    if (text.length <= maxChars) {
        return [text];
    }

    const lines = [];
    let currentLine = '';
    const words = text.split(' ');

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        if (testLine.length <= maxChars) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
            }
            // Handle very long words
            if (word.length > maxChars) {
                let remaining = word;
                while (remaining.length > maxChars) {
                    lines.push(remaining.substring(0, maxChars));
                    remaining = remaining.substring(maxChars);
                }
                currentLine = remaining;
            } else {
                currentLine = word;
            }
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
}

async function addMarkdownAsPdf(pdfDoc, markdownBytes, settings = {}, rotation = 0) {
    try {
        // Decode markdown from bytes
        const decoder = new TextDecoder('utf-8');
        const markdownText = decoder.decode(markdownBytes);

        // Convert markdown to HTML
        const html = marked.parse(markdownText);

        // Create a styled HTML document
        const styledHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; line-height: 1.6;">
                ${html}
            </div>
        `;

        // Convert HTML to image and add to PDF
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
    } catch (error) {
        console.error('Error converting Markdown to PDF:', error);
        throw error;
    }
}

async function addCsvAsPdf(pdfDoc, csvBytes, settings = {}, rotation = 0) {
    try {
        // Decode CSV from bytes
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(csvBytes);

        // Parse CSV using PapaParse
        const parsed = Papa.parse(csvText, {
            skipEmptyLines: true
        });

        if (!parsed.data || parsed.data.length === 0) {
            throw new Error('Empty CSV file');
        }

        // Create HTML table
        let tableHtml = '<table style="border-collapse: collapse; width: 100%; font-size: 11px;">';

        // Add header row (first row)
        if (parsed.data.length > 0) {
            tableHtml += '<thead><tr>';
            parsed.data[0].forEach(cell => {
                tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; font-weight: bold;">${escapeHtml(String(cell))}</th>`;
            });
            tableHtml += '</tr></thead>';
        }

        // Add data rows
        tableHtml += '<tbody>';
        for (let i = 1; i < parsed.data.length; i++) {
            tableHtml += '<tr>';
            parsed.data[i].forEach(cell => {
                tableHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(String(cell))}</td>`;
            });
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';

        const styledHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px;">
                ${tableHtml}
            </div>
        `;

        // Convert HTML to image and add to PDF
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
    } catch (error) {
        console.error('Error converting CSV to PDF:', error);
        throw error;
    }
}

async function addHtmlAsPdf(pdfDoc, htmlBytes, settings = {}, rotation = 0) {
    try {
        // Decode HTML from bytes
        const decoder = new TextDecoder('utf-8');
        const htmlText = decoder.decode(htmlBytes);

        // Wrap HTML in a container with basic styling
        const styledHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px;">
                ${htmlText}
            </div>
        `;

        // Convert HTML to image and add to PDF
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
    } catch (error) {
        console.error('Error converting HTML to PDF:', error);
        throw error;
    }
}

async function addDocxAsPdf(pdfDoc, docxBytes, settings = {}, rotation = 0) {
    try {
        if (!mammoth) {
            throw new Error('Mammoth library not loaded');
        }

        // Convert DOCX to HTML using mammoth
        const arrayBuffer = docxBytes.buffer.slice(docxBytes.byteOffset, docxBytes.byteOffset + docxBytes.byteLength);
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        const html = result.value;

        // Wrap the HTML with styling
        const styledHtml = `
            <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; line-height: 1.6;">
                ${html}
            </div>
        `;

        // Convert HTML to PDF page
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);

        // Log any warnings from mammoth
        if (result.messages && result.messages.length > 0) {
            console.log('DOCX conversion warnings:', result.messages);
        }
    } catch (error) {
        console.error('Error converting DOCX to PDF:', error);
        throw error;
    }
}

async function addXlsxAsPdf(pdfDoc, xlsxBytes, settings = {}, rotation = 0) {
    try {
        if (!XLSX) {
            throw new Error('XLSX library not loaded');
        }

        // Yield before processing
        await yieldToUI();

        // Parse XLSX file
        const workbook = XLSX.read(xlsxBytes, { type: 'array' });

        // Process each sheet
        for (let i = 0; i < workbook.SheetNames.length; i++) {
            // Yield between sheets to prevent freezing
            await yieldToUI();

            const sheetName = workbook.SheetNames[i];
            const worksheet = workbook.Sheets[sheetName];

            // Convert sheet to HTML
            const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
                header: '',
                footer: ''
            });

            // Wrap in styled container with sheet name
            const styledHtml = `
                <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; padding: 30px;">
                    <h2 style="color: #217346; margin-bottom: 20px; font-size: 24px;">${sheetName}</h2>
                    <style>
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            font-size: 11px;
                            margin-bottom: 20px;
                        }
                        th, td {
                            border: 1px solid #d0d0d0;
                            padding: 6px 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #217346;
                            color: white;
                            font-weight: bold;
                        }
                        tr:nth-child(even) {
                            background-color: #f2f2f2;
                        }
                    </style>
                    ${htmlTable}
                </div>
            `;

            // Convert HTML to PDF page
            await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
        }
    } catch (error) {
        console.error('Error converting XLSX to PDF:', error);
        throw error;
    }
}

async function addXmlAsPdf(pdfDoc, xmlBytes, settings = {}, rotation = 0) {
    try {
        // Decode XML from bytes
        const decoder = new TextDecoder('utf-8');
        const xmlText = decoder.decode(xmlBytes);

        // Format XML with indentation (basic formatting)
        let formattedXml = xmlText;
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const serializer = new XMLSerializer();
            formattedXml = serializer.serializeToString(xmlDoc);
        } catch (e) {
            // If formatting fails, use original
            formattedXml = xmlText;
        }

        // Escape HTML entities and add syntax highlighting
        const escapedXml = escapeHtml(formattedXml);
        const highlightedXml = escapedXml
            .replace(/(&lt;\/?)([\w:]+)([^&]*?)(\/?&gt;)/g,
                '<span style="color: #881280;">$1</span><span style="color: #1a1aa6;">$2</span><span style="color: #994500;">$3</span><span style="color: #881280;">$4</span>')
            .replace(/=&quot;([^&]*?)&quot;/g,
                '=<span style="color: #c41a16;">&quot;$1&quot;</span>');

        // Wrap in styled container with monospace font
        const styledHtml = `
            <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 10px; line-height: 1.5; padding: 20px; background-color: #f5f5f5;">
                <h3 style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin-bottom: 15px;">XML Document</h3>
                <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; background-color: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">${highlightedXml}</pre>
            </div>
        `;

        // Convert HTML to PDF page
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
    } catch (error) {
        console.error('Error converting XML to PDF:', error);
        throw error;
    }
}

async function addJsonAsPdf(pdfDoc, jsonBytes, settings = {}, rotation = 0) {
    try {
        // Decode JSON from bytes
        const decoder = new TextDecoder('utf-8');
        const jsonText = decoder.decode(jsonBytes);

        // Format JSON with indentation
        let formattedJson = jsonText;
        try {
            const jsonObj = JSON.parse(jsonText);
            formattedJson = JSON.stringify(jsonObj, null, 2);
        } catch (e) {
            // If parsing fails, use original
            formattedJson = jsonText;
        }

        // Escape HTML entities and add syntax highlighting
        const escapedJson = escapeHtml(formattedJson);
        const highlightedJson = escapedJson
            .replace(/&quot;([^&]*?)&quot;/g, '<span style="color: #c41a16;">&quot;$1&quot;</span>')
            .replace(/\b(\d+\.?\d*)\b/g, '<span style="color: #1c00cf;">$1</span>')
            .replace(/\b(true|false|null)\b/g, '<span style="color: #0000ff;">$1</span>')
            .replace(/([\{\}\[\]])/g, '<span style="color: #000000; font-weight: bold;">$1</span>');

        // Wrap in styled container with monospace font
        const styledHtml = `
            <div style="font-family: 'Consolas', 'Courier New', monospace; font-size: 10px; line-height: 1.5; padding: 20px; background-color: #f5f5f5;">
                <h3 style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin-bottom: 15px;">JSON Document</h3>
                <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; background-color: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">${highlightedJson}</pre>
            </div>
        `;

        // Convert HTML to PDF page
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
    } catch (error) {
        console.error('Error converting JSON to PDF:', error);
        throw error;
    }
}

async function addEpubAsPdf(pdfDoc, epubBytes, settings = {}, rotation = 0) {
    try {
        if (!JSZip) {
            throw new Error('JSZip library not loaded');
        }

        // Yield before processing
        await yieldToUI();

        // Load EPUB as ZIP archive
        const zip = await JSZip.loadAsync(epubBytes);

        // Find and parse content.opf to get reading order
        let contentHtml = '';
        const opfFile = Object.keys(zip.files).find(name => name.endsWith('.opf'));

        if (opfFile) {
            const opfContent = await zip.files[opfFile].async('text');
            const parser = new DOMParser();
            const opfDoc = parser.parseFromString(opfContent, 'text/xml');

            // Extract manifest and spine
            const manifestItems = {};
            const manifest = opfDoc.querySelector('manifest');
            if (manifest) {
                manifest.querySelectorAll('item').forEach(item => {
                    const id = item.getAttribute('id');
                    const href = item.getAttribute('href');
                    if (id && href) {
                        manifestItems[id] = href;
                    }
                });
            }

            // Get reading order from spine
            const spine = opfDoc.querySelector('spine');
            const basePath = opfFile.substring(0, opfFile.lastIndexOf('/') + 1);

            if (spine) {
                const spineItems = spine.querySelectorAll('itemref');
                for (const itemref of spineItems) {
                    await yieldToUI(); // Yield between chapters

                    const idref = itemref.getAttribute('idref');
                    if (idref && manifestItems[idref]) {
                        const href = manifestItems[idref];
                        const fullPath = basePath + href;

                        if (zip.files[fullPath]) {
                            const htmlContent = await zip.files[fullPath].async('text');
                            const bodyContent = extractBodyContent(htmlContent);
                            contentHtml += bodyContent + '<hr style="margin: 2em 0; border: none; border-top: 1px solid #ccc;" />';
                        }
                    }
                }
            }
        }

        // Fallback: if no content found, read all HTML files
        if (!contentHtml) {
            const htmlFiles = Object.keys(zip.files).filter(name =>
                name.endsWith('.html') || name.endsWith('.xhtml') || name.endsWith('.htm')
            );

            for (const file of htmlFiles) {
                await yieldToUI(); // Yield between files
                const htmlContent = await zip.files[file].async('text');
                const bodyContent = extractBodyContent(htmlContent);
                contentHtml += bodyContent + '<hr style="margin: 2em 0; border: none; border-top: 1px solid #ccc;" />';
            }
        }

        if (!contentHtml) {
            contentHtml = '<p>No readable content found in EPUB file.</p>';
        }

        // Wrap in styled container with book-like formatting
        const styledHtml = `
            <div style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.6; padding: 40px; max-width: 800px; color: #333;">
                <style>
                    h1, h2, h3, h4, h5, h6 {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        margin-top: 1.5em;
                        margin-bottom: 0.5em;
                        color: #222;
                    }
                    p {
                        margin: 0.8em 0;
                        text-align: justify;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                        margin: 1em auto;
                    }
                    blockquote {
                        margin: 1em 2em;
                        padding-left: 1em;
                        border-left: 3px solid #ccc;
                        font-style: italic;
                    }
                </style>
                ${contentHtml}
            </div>
        `;

        // Convert HTML to PDF page
        await convertHtmlToPdfPage(pdfDoc, styledHtml, rotation);
    } catch (error) {
        console.error('Error converting EPUB to PDF:', error);
        throw error;
    }
}

// Helper function to extract body content from HTML
function extractBodyContent(html) {
    const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
    return bodyMatch ? bodyMatch[1] : html;
}

async function convertHtmlToPdfPage(pdfDoc, htmlContent, rotation = 0) {
    try {
        // Yield to UI before heavy HTML rendering
        await yieldToUI();

        // Create a temporary div to render the HTML
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px'; // Fixed width for consistent rendering
        tempDiv.style.backgroundColor = 'white';
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);

        // Yield before canvas rendering (intensive operation)
        await yieldToUI();

        // Use html2canvas to render the HTML to a canvas
        const canvas = await html2canvas(tempDiv, {
            scale: 2, // Higher quality
            backgroundColor: '#ffffff',
            logging: false
        });

        // Remove temporary div
        document.body.removeChild(tempDiv);

        // Yield after canvas rendering
        await yieldToUI();

        // Convert canvas to PNG bytes
        const pngDataUrl = canvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer()).then(b => new Uint8Array(b));

        // Embed PNG in PDF
        const image = await pdfDoc.embedPng(pngBytes);

        // Calculate page size to fit the image
        const scale = Math.min(792 / canvas.height, 612 / canvas.width); // Fit to letter size
        const pageWidth = canvas.width * scale;
        const pageHeight = canvas.height * scale;

        // Add page with appropriate size
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
        });

        // Apply file-level rotation if specified
        if (rotation !== 0) {
            page.setRotation(pdfLib.degrees(rotation));
        }
    } catch (error) {
        console.error('Error converting HTML to PDF page:', error);
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export async function generatePdfThumbnail(pdfBytes) {
    try {
        if (!pdfjsLib) await initialize();

        const uint8Array = new Uint8Array(pdfBytes);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const scale = 1.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            enableWebGL: false
        };

        await page.render(renderContext).promise;

        const maxSize = 250;
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailContext = thumbnailCanvas.getContext('2d', { willReadFrequently: true });

        let width = canvas.width;
        let height = canvas.height;

        if (width > height) {
            if (width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
        }

        thumbnailCanvas.width = width;
        thumbnailCanvas.height = height;
        thumbnailContext.drawImage(canvas, 0, 0, width, height);

        return thumbnailCanvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating PDF thumbnail:', error);
        return getPdfIcon();
    }
}

// Generate thumbnail for a specific PDF page
export async function generatePdfPageThumbnail(pdfBytes, pageNumber) {
    try {
        if (!pdfjsLib) await initialize();

        const uint8Array = new Uint8Array(pdfBytes);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;

        // Validate page number
        const numPages = pdf.numPages;
        if (pageNumber < 1 || pageNumber > numPages) {
            throw new Error(`Invalid page number: ${pageNumber}. Document has ${numPages} pages.`);
        }

        const page = await pdf.getPage(pageNumber);

        const scale = 0.5; // Smaller scale for page selector thumbnails
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            enableWebGL: false
        };

        await page.render(renderContext).promise;

        const maxSize = 150; // Smaller for page selector
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailContext = thumbnailCanvas.getContext('2d', { willReadFrequently: true });

        let width = canvas.width;
        let height = canvas.height;

        if (width > height) {
            if (width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
        }

        thumbnailCanvas.width = width;
        thumbnailCanvas.height = height;
        thumbnailContext.drawImage(canvas, 0, 0, width, height);

        return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
        console.error('Error generating PDF page thumbnail:', error);
        return getPdfIcon();
    }
}

export async function generateImageThumbnail(imageBytes, mimeType) {
    try {
        return new Promise((resolve, reject) => {
            const blob = new Blob([imageBytes], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                const maxSize = 250;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                URL.revokeObjectURL(url);
                resolve(dataUrl);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    } catch (error) {
        console.error('Error generating image thumbnail:', error);
        return getImageIcon();
    }
}

export async function generateTextThumbnail(textBytes) {
    try {
        // Decode text from bytes
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(textBytes);

        // Get first few lines
        const lines = text.split('\n').slice(0, 8);
        const preview = lines.map(line => line.substring(0, 40)).join('\n');

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 250, 250);

        // Draw text
        ctx.fillStyle = '#333333';
        ctx.font = '14px monospace';

        const textLines = preview.split('\n');
        textLines.forEach((line, index) => {
            ctx.fillText(line.substring(0, 30), 8, 20 + (index * 18));
        });

        // Add border
        ctx.strokeStyle = '#cccccc';
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating text thumbnail:', error);
        return getTextIcon();
    }
}

export async function generateMarkdownThumbnail(markdownBytes) {
    try {
        // Decode markdown from bytes
        const decoder = new TextDecoder('utf-8');
        const markdownText = decoder.decode(markdownBytes);

        // Get first few lines
        const lines = markdownText.split('\n').slice(0, 10);
        const preview = lines.map(line => line.substring(0, 35)).join('\n');

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 250);

        // MD icon
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('MD', 10, 30);

        // Draw markdown text
        ctx.fillStyle = '#212529';
        ctx.font = '12px monospace';

        const textLines = preview.split('\n');
        textLines.forEach((line, index) => {
            ctx.fillText(line, 8, 50 + (index * 16));
        });

        // Border
        ctx.strokeStyle = '#6c757d';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating markdown thumbnail:', error);
        return getDocumentIcon('MD', '#6c757d');
    }
}

export async function generateCsvThumbnail(csvBytes) {
    try {
        // Decode CSV from bytes
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(csvBytes);

        // Parse CSV
        const parsed = Papa.parse(csvText, { skipEmptyLines: true });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Light green background
        ctx.fillStyle = '#d4edda';
        ctx.fillRect(0, 0, 250, 250);

        // CSV icon
        ctx.fillStyle = '#155724';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('CSV', 10, 28);

        // Draw table preview
        ctx.strokeStyle = '#28a745';
        ctx.fillStyle = '#155724';
        ctx.font = '10px monospace';

        const maxRows = Math.min(8, parsed.data.length);
        const maxCols = Math.min(3, parsed.data[0]?.length || 0);

        for (let row = 0; row < maxRows; row++) {
            for (let col = 0; col < maxCols; col++) {
                const cellValue = parsed.data[row]?.[col] || '';
                const text = cellValue.toString().substring(0, 10);
                const x = 10 + (col * 75);
                const y = 50 + (row * 20);

                // Draw cell border
                ctx.strokeRect(x, y - 12, 70, 18);

                // Draw cell text
                ctx.fillText(text, x + 2, y);
            }
        }

        // Border
        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating CSV thumbnail:', error);
        return getDocumentIcon('CSV', '#28a745');
    }
}

export async function generateHtmlThumbnail(htmlBytes) {
    try {
        // Decode HTML from bytes
        const decoder = new TextDecoder('utf-8');
        const htmlText = decoder.decode(htmlBytes);

        // Get first few lines
        const lines = htmlText.split('\n').slice(0, 10);
        const preview = lines.map(line => line.substring(0, 32)).join('\n');

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Light blue background
        ctx.fillStyle = '#cfe2ff';
        ctx.fillRect(0, 0, 250, 250);

        // HTML icon
        ctx.fillStyle = '#084298';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('HTML', 10, 28);

        // Draw HTML text
        ctx.fillStyle = '#084298';
        ctx.font = '11px monospace';

        const textLines = preview.split('\n');
        textLines.forEach((line, index) => {
            ctx.fillText(line, 8, 50 + (index * 16));
        });

        // Border
        ctx.strokeStyle = '#0d6efd';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating HTML thumbnail:', error);
        return getDocumentIcon('HTML', '#0d6efd');
    }
}

export async function generateTiffThumbnail(tiffBytes) {
    try {
        if (!UTIF) {
            throw new Error('UTIF library not loaded');
        }

        // Convert TIFF to PNG using our existing function
        const pngBytes = await convertTiffToPng(tiffBytes);

        // Create a blob from the PNG bytes
        const blob = new Blob([pngBytes], { type: 'image/png' });
        const url = URL.createObjectURL(blob);

        // Load the image
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const maxSize = 250;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Clean up
        URL.revokeObjectURL(url);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating TIFF thumbnail:', error);
        return getImageIcon();
    }
}

export async function generateAvifThumbnail(avifBytes) {
    try {
        // Create a blob from the AVIF bytes
        const blob = new Blob([avifBytes], { type: 'image/avif' });
        const url = URL.createObjectURL(blob);

        // Load the image (browser will handle AVIF decoding)
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const maxSize = 250;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Clean up
        URL.revokeObjectURL(url);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating AVIF thumbnail:', error);
        return getImageIcon();
    }
}

export async function generateDocxThumbnail(docxBytes) {
    try {
        if (!mammoth) {
            throw new Error('Mammoth library not loaded');
        }

        // Convert DOCX to plain text for preview
        const arrayBuffer = docxBytes.buffer.slice(docxBytes.byteOffset, docxBytes.byteOffset + docxBytes.byteLength);
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        const text = result.value;

        // Get first few lines for preview
        const lines = text.split('\n').filter(line => line.trim().length > 0).slice(0, 10);
        const preview = lines.map(line => line.substring(0, 35)).join('\n');

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Blue gradient background (Word theme)
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#e7f3ff');
        gradient.addColorStop(1, '#cfe2ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 250);

        // Word icon
        ctx.fillStyle = '#2b579a';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('DOCX', 10, 30);

        // Draw text preview
        ctx.fillStyle = '#212529';
        ctx.font = '11px Arial';
        const textLines = preview.split('\n');
        textLines.forEach((line, index) => {
            ctx.fillText(line, 8, 55 + (index * 16));
        });

        // Border
        ctx.strokeStyle = '#2b579a';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating DOCX thumbnail:', error);
        return getDocumentIcon('DOCX', '#2b579a');
    }
}

export async function generateXlsxThumbnail(xlsxBytes) {
    try {
        if (!XLSX) {
            throw new Error('XLSX library not loaded');
        }

        // Parse XLSX file
        const workbook = XLSX.read(xlsxBytes, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays for easier processing
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Green gradient background (Excel theme)
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#e2f0d9');
        gradient.addColorStop(1, '#c6e0b4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 250);

        // Excel icon
        ctx.fillStyle = '#217346';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('XLSX', 10, 28);

        // Draw spreadsheet grid preview
        ctx.strokeStyle = '#217346';
        ctx.fillStyle = '#1e5631';
        ctx.font = '9px monospace';

        const maxRows = Math.min(8, data.length);
        const maxCols = Math.min(3, Math.max(...data.slice(0, maxRows).map(row => row?.length || 0)));

        for (let row = 0; row < maxRows; row++) {
            for (let col = 0; col < maxCols; col++) {
                const cellValue = data[row]?.[col] || '';
                const text = cellValue.toString().substring(0, 10);
                const x = 10 + (col * 75);
                const y = 50 + (row * 20);

                // Draw cell border
                ctx.strokeRect(x, y - 12, 70, 18);

                // Draw cell content
                ctx.fillText(text, x + 2, y);
            }
        }

        // Border
        ctx.strokeStyle = '#217346';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating XLSX thumbnail:', error);
        return getDocumentIcon('XLSX', '#217346');
    }
}

export async function generateXmlThumbnail(xmlBytes) {
    try {
        // Decode XML from bytes
        const decoder = new TextDecoder('utf-8');
        const xmlText = decoder.decode(xmlBytes);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Purple gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#e8daef');
        gradient.addColorStop(1, '#d2b4de');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 250);

        // XML icon
        ctx.fillStyle = '#881280';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('XML', 10, 28);

        // Draw XML preview (first few lines)
        ctx.fillStyle = '#4a235a';
        ctx.font = '8px monospace';
        const lines = xmlText.split('\n').slice(0, 20);
        for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const line = lines[i].substring(0, 35);
            ctx.fillText(line, 10, 50 + (i * 10));
        }

        // Border
        ctx.strokeStyle = '#881280';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating XML thumbnail:', error);
        return getDocumentIcon('XML', '#881280');
    }
}

export async function generateJsonThumbnail(jsonBytes) {
    try {
        // Decode JSON from bytes
        const decoder = new TextDecoder('utf-8');
        const jsonText = decoder.decode(jsonBytes);

        // Format JSON
        let formattedJson = jsonText;
        try {
            const jsonObj = JSON.parse(jsonText);
            formattedJson = JSON.stringify(jsonObj, null, 2);
        } catch (e) {
            // If parsing fails, use original
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Blue gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#d6eaf8');
        gradient.addColorStop(1, '#aed6f1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 250);

        // JSON icon
        ctx.fillStyle = '#1c00cf';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('JSON', 10, 28);

        // Draw JSON preview (first few lines)
        ctx.fillStyle = '#154360';
        ctx.font = '8px monospace';
        const lines = formattedJson.split('\n').slice(0, 20);
        for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const line = lines[i].substring(0, 35);
            ctx.fillText(line, 10, 50 + (i * 10));
        }

        // Border
        ctx.strokeStyle = '#1c00cf';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating JSON thumbnail:', error);
        return getDocumentIcon('JSON', '#1c00cf');
    }
}

export async function generateEpubThumbnail(epubBytes) {
    try {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = 250;
        canvas.height = 250;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Brown/sepia gradient background (book-like)
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, '#f5e6d3');
        gradient.addColorStop(1, '#d7c9b8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 250);

        // Draw book icon
        ctx.fillStyle = '#6b4423';

        // Book cover
        ctx.fillRect(50, 40, 150, 180);

        // Book spine highlight
        ctx.fillStyle = '#8b6f47';
        ctx.fillRect(55, 40, 10, 180);

        // Pages effect
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(190, 43, 5, 174);
        ctx.fillRect(185, 46, 5, 168);

        // EPUB text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EPUB', 125, 90);

        // Book lines decoration
        ctx.strokeStyle = '#8b6f47';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(70, 110);
        ctx.lineTo(180, 110);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(70, 120);
        ctx.lineTo(180, 120);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(70, 130);
        ctx.lineTo(180, 130);
        ctx.stroke();

        // Border
        ctx.strokeStyle = '#6b4423';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 250, 250);

        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
        console.error('Error generating EPUB thumbnail:', error);
        return getDocumentIcon('EPUB', '#6b4423');
    }
}

function getDocumentIcon(label, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 250;
    canvas.height = 250;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 250, 250);

    ctx.fillStyle = color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 125, 125);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 250, 250);

    return canvas.toDataURL('image/jpeg', 0.8);
}

export async function extractZipFiles(zipBytes) {
    try {
        if (!JSZip) await initialize();

        if (!JSZip) {
            throw new Error('JSZip library not loaded');
        }

        const zip = new JSZip();
        await zip.loadAsync(zipBytes);

        const extractedFiles = [];
        const supportedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.heic', '.heif', '.txt'];

        for (const [filename, file] of Object.entries(zip.files)) {
            // Skip directories and hidden files
            if (file.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) {
                continue;
            }

            // Check if file has supported extension
            const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
            if (!supportedExtensions.includes(ext)) {
                continue;
            }

            // Extract file data
            const data = await file.async('uint8array');

            // Determine content type based on extension
            const contentType = getContentTypeFromExtension(ext);

            extractedFiles.push({
                name: filename.split('/').pop(), // Get filename without path
                bytes: data, // Return Uint8Array directly - Blazor handles it natively
                type: contentType,
                size: data.length
            });
        }

        return extractedFiles;
    } catch (error) {
        console.error('Error extracting ZIP:', error);
        throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
}

function getContentTypeFromExtension(ext) {
    const contentTypes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
        '.txt': 'text/plain'
    };
    return contentTypes[ext] || 'application/octet-stream';
}

export function downloadFile(fileName, byteArray) {
    try {
        const blob = new Blob([new Uint8Array(byteArray)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
}

export async function downloadAsZip(fileName, files) {
    try {
        if (!JSZip) {
            console.error('JSZip is not loaded');
            throw new Error('JSZip library is not available');
        }

        const zip = new JSZip();

        // Add files to zip
        for (const file of files) {
            zip.file(file.name, new Uint8Array(file.data));
        }

        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download zip
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error creating/downloading ZIP file:', error);
        throw error;
    }
}

function getPdfIcon() {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <text x="50%" y="60%" text-anchor="middle" font-size="6" fill="#dc3545" font-family="Arial, sans-serif">PDF</text>
        </svg>
    `);
}

function getImageIcon() {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#17a2b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
    `);
}

function getTextIcon() {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#6c757d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    `);
}
