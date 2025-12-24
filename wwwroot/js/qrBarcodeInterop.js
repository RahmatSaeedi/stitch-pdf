// QR Code and Barcode generation

// Generate QR Code as data URL
export async function generateQRCode(text, options = {}) {
    try {
        if (!window.QRCode) {
            console.error('QRCode library not loaded');
            return null;
        }

        // Create temporary container for QR code
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        // Generate QR code using qrcodejs library
        const qr = new QRCode(container, {
            text: text,
            width: options.width || 300,
            height: options.width || 300,
            colorDark: options.darkColor || '#000000',
            colorLight: options.lightColor || '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.M
        });

        // Wait a moment for QR code to render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get the canvas or image element
        const canvas = container.querySelector('canvas');
        const img = container.querySelector('img');

        let dataUrl;
        if (canvas) {
            dataUrl = canvas.toDataURL('image/png');
        } else if (img) {
            dataUrl = img.src;
        }

        // Cleanup
        document.body.removeChild(container);

        return dataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        return null;
    }
}

// Generate Barcode as data URL
export function generateBarcode(text, format = 'CODE128', options = {}) {
    try {
        if (!window.JsBarcode) {
            console.error('JsBarcode library not loaded');
            return null;
        }

        const canvas = document.createElement('canvas');

        JsBarcode(canvas, text, {
            format: format,
            width: options.width || 2,
            height: options.height || 100,
            displayValue: options.displayValue !== false,
            fontSize: options.fontSize || 20,
            margin: options.margin || 10,
            background: options.background || '#FFFFFF',
            lineColor: options.lineColor || '#000000'
        });

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error generating barcode:', error);
        return null;
    }
}

// Add QR code to PDF
export async function addQRCodeToPDF(pdfBytes, qrText, pageNumber, x, y, size, options = {}) {
    try {
        // Generate QR code
        const qrDataUrl = await generateQRCode(qrText, { width: size, ...options });
        if (!qrDataUrl) return null;

        // Load PDF
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        // Convert data URL to bytes
        const qrBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());

        // Embed QR image
        const qrImage = await pdfDoc.embedPng(qrBytes);

        // Get page
        const pages = pdfDoc.getPages();
        const page = pages[pageNumber] || pages[0];

        // Draw QR code
        page.drawImage(qrImage, {
            x: x,
            y: page.getHeight() - y - size,
            width: size,
            height: size
        });

        // Save PDF
        const modifiedPdfBytes = await pdfDoc.save();
        return new Uint8Array(modifiedPdfBytes);
    } catch (error) {
        console.error('Error adding QR code to PDF:', error);
        return null;
    }
}

// Add Barcode to PDF
export async function addBarcodeToPDF(pdfBytes, barcodeText, format, pageNumber, x, y, width, height, options = {}) {
    try {
        // Generate barcode
        const barcodeDataUrl = generateBarcode(barcodeText, format, {
            width: 2,
            height: height,
            ...options
        });
        if (!barcodeDataUrl) return null;

        // Load PDF
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        // Convert data URL to bytes
        const barcodeBytes = await fetch(barcodeDataUrl).then(res => res.arrayBuffer());

        // Embed barcode image
        const barcodeImage = await pdfDoc.embedPng(barcodeBytes);

        // Get page
        const pages = pdfDoc.getPages();
        const page = pages[pageNumber] || pages[0];

        // Draw barcode
        page.drawImage(barcodeImage, {
            x: x,
            y: page.getHeight() - y - height,
            width: width,
            height: height
        });

        // Save PDF
        const modifiedPdfBytes = await pdfDoc.save();
        return new Uint8Array(modifiedPdfBytes);
    } catch (error) {
        console.error('Error adding barcode to PDF:', error);
        return null;
    }
}

// Get supported barcode formats
export function getSupportedBarcodeFormats() {
    return [
        { value: 'CODE128', label: 'Code 128' },
        { value: 'CODE39', label: 'Code 39' },
        { value: 'EAN13', label: 'EAN-13' },
        { value: 'EAN8', label: 'EAN-8' },
        { value: 'UPC', label: 'UPC' },
        { value: 'ITF14', label: 'ITF-14' },
        { value: 'MSI', label: 'MSI' },
        { value: 'pharmacode', label: 'Pharmacode' },
        { value: 'codabar', label: 'Codabar' }
    ];
}

// Validate barcode text for format
export function validateBarcodeText(text, format) {
    try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, text, { format: format });
        return true;
    } catch (error) {
        return false;
    }
}
