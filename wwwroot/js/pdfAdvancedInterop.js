// Advanced PDF manipulation features

// Split PDF by page ranges
export async function splitPDF(pdfBytes, ranges) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const results = [];

        for (const range of ranges) {
            const newPdf = await PDFLib.PDFDocument.create();

            // Copy pages in range
            const pageIndices = [];
            for (let i = range.start - 1; i < range.end; i++) {
                if (i >= 0 && i < pdfDoc.getPageCount()) {
                    pageIndices.push(i);
                }
            }

            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytesResult = await newPdf.save();

            results.push({
                name: range.name || `pages_${range.start}_to_${range.end}.pdf`,
                bytes: new Uint8Array(pdfBytesResult),
                pageCount: pageIndices.length
            });
        }

        return results;
    } catch (error) {
        console.error('Error splitting PDF:', error);
        return [];
    }
}

// Extract specific pages from PDF
export async function extractPages(pdfBytes, pageNumbers) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const newPdf = await PDFLib.PDFDocument.create();

        // Convert page numbers to indices
        const pageIndices = pageNumbers.map(p => p - 1).filter(i => i >= 0 && i < pdfDoc.getPageCount());

        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytesResult = await newPdf.save();
        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error extracting pages:', error);
        return null;
    }
}

// Delete specific pages from PDF
export async function deletePages(pdfBytes, pageNumbers) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPageCount();

        // Sort in descending order to avoid index shifting
        const sortedPages = [...pageNumbers].sort((a, b) => b - a);

        for (const pageNum of sortedPages) {
            const index = pageNum - 1;
            if (index >= 0 && index < totalPages) {
                pdfDoc.removePage(index);
            }
        }

        const pdfBytesResult = await pdfDoc.save();
        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error deleting pages:', error);
        return null;
    }
}

// Add watermark to PDF
export async function addWatermark(pdfBytes, watermarkText, options = {}) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const fontSize = options.fontSize || 48;
        const opacity = options.opacity || 0.3;
        const rotation = options.rotation || -45;
        const color = options.color || '#000000';

        // Parse color
        const rgb = hexToRgb(color);

        for (const page of pages) {
            const { width, height } = page.getSize();

            // Draw watermark in center
            page.drawText(watermarkText, {
                x: width / 2 - (watermarkText.length * fontSize) / 4,
                y: height / 2,
                size: fontSize,
                opacity: opacity,
                rotate: PDFLib.degrees(rotation),
                color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
            });
        }

        const pdfBytesResult = await pdfDoc.save();
        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error adding watermark:', error);
        return null;
    }
}

// Add image watermark to PDF
export async function addImageWatermark(pdfBytes, imageBytes, imageType, options = {}) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Embed image
        let watermarkImage;
        if (imageType === 'image/png') {
            watermarkImage = await pdfDoc.embedPng(imageBytes);
        } else if (imageType === 'image/jpeg' || imageType === 'image/jpg') {
            watermarkImage = await pdfDoc.embedJpg(imageBytes);
        } else {
            throw new Error('Unsupported image type for watermark');
        }

        const scale = options.scale || 0.3;
        const opacity = options.opacity || 0.3;
        const position = options.position || 'center';

        for (const page of pages) {
            const { width, height } = page.getSize();

            const watermarkWidth = watermarkImage.width * scale;
            const watermarkHeight = watermarkImage.height * scale;

            let x, y;
            switch (position) {
                case 'top-left':
                    x = 20;
                    y = height - watermarkHeight - 20;
                    break;
                case 'top-right':
                    x = width - watermarkWidth - 20;
                    y = height - watermarkHeight - 20;
                    break;
                case 'bottom-left':
                    x = 20;
                    y = 20;
                    break;
                case 'bottom-right':
                    x = width - watermarkWidth - 20;
                    y = 20;
                    break;
                case 'center':
                default:
                    x = (width - watermarkWidth) / 2;
                    y = (height - watermarkHeight) / 2;
                    break;
            }

            page.drawImage(watermarkImage, {
                x: x,
                y: y,
                width: watermarkWidth,
                height: watermarkHeight,
                opacity: opacity
            });
        }

        const pdfBytesResult = await pdfDoc.save();
        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error adding image watermark:', error);
        return null;
    }
}

// Add page numbers to PDF
export async function addPageNumbers(pdfBytes, options = {}) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const fontSize = options.fontSize || 10;
        const position = options.position || 'bottom-center';
        const format = options.format || '{page}';
        const startPage = options.startPage || 1;
        const color = options.color || '#000000';
        const rgb = hexToRgb(color);

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            const pageNum = i + startPage;
            const totalPages = pages.length;

            let text = format
                .replace('{page}', pageNum)
                .replace('{total}', totalPages);

            let x, y;
            const textWidth = text.length * fontSize * 0.5;

            switch (position) {
                case 'top-left':
                    x = 20;
                    y = height - 20;
                    break;
                case 'top-center':
                    x = (width - textWidth) / 2;
                    y = height - 20;
                    break;
                case 'top-right':
                    x = width - textWidth - 20;
                    y = height - 20;
                    break;
                case 'bottom-left':
                    x = 20;
                    y = 20;
                    break;
                case 'bottom-center':
                default:
                    x = (width - textWidth) / 2;
                    y = 20;
                    break;
                case 'bottom-right':
                    x = width - textWidth - 20;
                    y = 20;
                    break;
            }

            page.drawText(text, {
                x: x,
                y: y,
                size: fontSize,
                color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
            });
        }

        const pdfBytesResult = await pdfDoc.save();
        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error adding page numbers:', error);
        return null;
    }
}

// Compress PDF (reduce file size)
export async function compressPDF(pdfBytes, quality = 'medium') {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        // Compression options based on quality
        const compressionOptions = {
            high: { objectsPerTick: 50, updateFieldAppearances: false },
            medium: { objectsPerTick: 200, updateFieldAppearances: false },
            low: { objectsPerTick: 500, updateFieldAppearances: false }
        };

        const options = compressionOptions[quality] || compressionOptions.medium;

        const pdfBytesResult = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            ...options
        });

        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error compressing PDF:', error);
        return null;
    }
}

// Protect PDF with password
export async function protectPDF(pdfBytes, userPassword, ownerPassword = null) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        const pdfBytesResult = await pdfDoc.save({
            userPassword: userPassword,
            ownerPassword: ownerPassword || userPassword,
            permissions: {
                printing: 'highResolution',
                modifying: false,
                copying: false,
                annotating: false,
                fillingForms: false,
                contentAccessibility: true,
                documentAssembly: false
            }
        });

        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error protecting PDF:', error);
        return null;
    }
}

// Edit PDF metadata
export async function editMetadata(pdfBytes, metadata) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        if (metadata.title) pdfDoc.setTitle(metadata.title);
        if (metadata.author) pdfDoc.setAuthor(metadata.author);
        if (metadata.subject) pdfDoc.setSubject(metadata.subject);
        if (metadata.keywords) pdfDoc.setKeywords(metadata.keywords.split(',').map(k => k.trim()));
        if (metadata.creator) pdfDoc.setCreator(metadata.creator);
        if (metadata.producer) pdfDoc.setProducer(metadata.producer);

        const pdfBytesResult = await pdfDoc.save();
        return new Uint8Array(pdfBytesResult);
    } catch (error) {
        console.error('Error editing metadata:', error);
        return null;
    }
}

// Get PDF metadata
export async function getMetadata(pdfBytes) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        return {
            title: pdfDoc.getTitle() || '',
            author: pdfDoc.getAuthor() || '',
            subject: pdfDoc.getSubject() || '',
            keywords: pdfDoc.getKeywords()?.join(', ') || '',
            creator: pdfDoc.getCreator() || '',
            producer: pdfDoc.getProducer() || '',
            creationDate: pdfDoc.getCreationDate()?.toISOString() || '',
            modificationDate: pdfDoc.getModificationDate()?.toISOString() || '',
            pageCount: pdfDoc.getPageCount()
        };
    } catch (error) {
        console.error('Error getting metadata:', error);
        return null;
    }
}

// Extract images from PDF
export async function extractImages(pdfBytes) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const images = [];

        // Note: pdf-lib doesn't directly support image extraction
        // This is a placeholder - would need additional library like pdf.js
        console.warn('Image extraction requires additional processing with PDF.js');

        return images;
    } catch (error) {
        console.error('Error extracting images:', error);
        return [];
    }
}

// Convert PDF pages to images
export async function pdfPagesToImages(pdfBytes, scale = 2.0, format = 'png') {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const images = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageDataUrl = canvas.toDataURL(`image/${format}`);
            const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());

            images.push({
                pageNumber: pageNum,
                dataUrl: imageDataUrl,
                bytes: new Uint8Array(imageBytes),
                width: viewport.width,
                height: viewport.height
            });
        }

        return images;
    } catch (error) {
        console.error('Error converting PDF to images:', error);
        return [];
    }
}

// Utility: Convert hex color to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
}
