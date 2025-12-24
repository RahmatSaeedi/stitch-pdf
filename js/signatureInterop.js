// E-Signature functionality using SignaturePad
let signaturePad = null;
let signatureCanvas = null;

// Initialize signature pad
export function initializeSignaturePad(canvasElement, dotNetRef) {
    if (!canvasElement) {
        console.error('Canvas element not found');
        return false;
    }

    signatureCanvas = canvasElement;

    // Resize canvas to match CSS size
    resizeCanvas();

    // Initialize SignaturePad
    signaturePad = new SignaturePad(signatureCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 0.5,
        maxWidth: 2.5,
        throttle: 16,
        minDistance: 5,
        velocityFilterWeight: 0.7
    });

    // Notify C# when signature is drawn
    signaturePad.addEventListener('endStroke', () => {
        if (dotNetRef) {
            dotNetRef.invokeMethodAsync('OnSignatureDrawn');
        }
    });

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    console.log('SignaturePad initialized');
    return true;
}

// Resize canvas to match display size
function resizeCanvas() {
    if (!signatureCanvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = signatureCanvas.getBoundingClientRect();

    signatureCanvas.width = rect.width * ratio;
    signatureCanvas.height = rect.height * ratio;

    const ctx = signatureCanvas.getContext('2d');
    ctx.scale(ratio, ratio);

    if (signaturePad) {
        signaturePad.clear();
    }
}

// Clear signature
export function clearSignature() {
    if (signaturePad) {
        signaturePad.clear();
        return true;
    }
    return false;
}

// Check if signature is empty
export function isSignatureEmpty() {
    return signaturePad ? signaturePad.isEmpty() : true;
}

// Get signature as data URL (PNG)
export function getSignatureDataUrl() {
    if (!signaturePad || signaturePad.isEmpty()) {
        return null;
    }
    return signaturePad.toDataURL('image/png');
}

// Get signature with transparent background option
export function getSignatureDataUrlWithBackground(transparent = false) {
    if (!signaturePad || signaturePad.isEmpty()) {
        return null;
    }

    const dataUrl = signaturePad.toDataURL('image/png');

    if (!transparent) {
        return dataUrl;
    }

    // Process to make background transparent
    return makeBackgroundTransparent(dataUrl);
}

// Make white background transparent in image
function makeBackgroundTransparent(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Make white pixels transparent (with some tolerance)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // If pixel is close to white, make it transparent
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0; // Set alpha to 0
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = dataUrl;
    });
}

// Get signature as SVG
export function getSignatureSVG() {
    if (!signaturePad || signaturePad.isEmpty()) {
        return null;
    }
    return signaturePad.toSVG();
}

// Set signature pen color
export function setSignaturePenColor(color) {
    if (signaturePad) {
        signaturePad.penColor = color;
        return true;
    }
    return false;
}

// Set signature background color
export function setSignatureBackgroundColor(color) {
    if (signaturePad) {
        signaturePad.backgroundColor = color;
        signaturePad.clear(); // Need to clear to apply background
        return true;
    }
    return false;
}

// Undo last stroke
export function undoSignature() {
    if (!signaturePad) return false;

    const data = signaturePad.toData();
    if (data && data.length > 0) {
        data.pop();
        signaturePad.fromData(data);
        return true;
    }
    return false;
}

// Load signature from data URL
export function loadSignatureFromDataUrl(dataUrl) {
    if (!signaturePad) return false;

    const img = new Image();
    img.onload = () => {
        const ctx = signatureCanvas.getContext('2d');
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
    return true;
}

// Create typed signature on canvas
export function createTypedSignature(text, fontFamily, fontSize, color) {
    return createTypedSignatureWithBackground(text, fontFamily, fontSize, color, false);
}

// Create typed signature with optional transparent background
export function createTypedSignatureWithBackground(text, fontFamily, fontSize, color, transparent = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;

    const ctx = canvas.getContext('2d');

    if (!transparent) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = color || '#000000';
    ctx.font = `${fontSize || 48}px ${fontFamily || 'cursive'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
}

// Add signature to PDF at specified position
export async function addSignatureToPDF(pdfBytes, signatureDataUrl, pageNumber, x, y, width, height) {
    try {
        // Load PDF
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);

        // Convert data URL to bytes
        const signatureBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());

        // Embed signature image
        const signatureImage = await pdfDoc.embedPng(signatureBytes);

        // Get page
        const pages = pdfDoc.getPages();
        const page = pages[pageNumber] || pages[0];

        // Draw signature
        page.drawImage(signatureImage, {
            x: x,
            y: page.getHeight() - y - height, // PDF coordinates are bottom-left
            width: width,
            height: height,
            opacity: 1.0
        });

        // Save PDF
        const modifiedPdfBytes = await pdfDoc.save();
        return new Uint8Array(modifiedPdfBytes);
    } catch (error) {
        console.error('Error adding signature to PDF:', error);
        return null;
    }
}

// Save signature to local storage
export function saveSignatureToStorage(name, dataUrl) {
    try {
        const signatures = JSON.parse(localStorage.getItem('savedSignatures') || '[]');
        signatures.push({
            name: name,
            dataUrl: dataUrl,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('savedSignatures', JSON.stringify(signatures));
        return true;
    } catch (error) {
        console.error('Error saving signature:', error);
        return false;
    }
}

// Get saved signatures from local storage
export function getSavedSignatures() {
    try {
        return JSON.parse(localStorage.getItem('savedSignatures') || '[]');
    } catch (error) {
        console.error('Error loading signatures:', error);
        return [];
    }
}

// Delete saved signature
export function deleteSignature(name) {
    try {
        const signatures = JSON.parse(localStorage.getItem('savedSignatures') || '[]');
        const filtered = signatures.filter(s => s.name !== name);
        localStorage.setItem('savedSignatures', JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error deleting signature:', error);
        return false;
    }
}

// Cleanup
export function disposeSignaturePad() {
    if (signaturePad) {
        signaturePad.off();
        signaturePad = null;
    }
    signatureCanvas = null;
    window.removeEventListener('resize', resizeCanvas);
}
