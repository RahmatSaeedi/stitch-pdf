// PDF Processing Web Worker
// This worker runs in a separate thread to keep the UI responsive during heavy PDF operations

let pdfLib;
let pdfjsLib;

// Import PDF libraries in worker context
self.addEventListener('message', async (e) => {
    const { type, data, id } = e.data;

    try {
        switch (type) {
            case 'init':
                await initializeLibraries(data.libPaths);
                postMessage({ type: 'init', id, success: true });
                break;

            case 'mergePdfs':
                const mergedPdf = await mergePdfs(data.files, data.options);
                postMessage({ type: 'mergePdfs', id, success: true, result: mergedPdf }, [mergedPdf]);
                break;

            case 'compressPdf':
                const compressedPdf = await compressPdf(data.pdfBytes, data.quality);
                postMessage({ type: 'compressPdf', id, success: true, result: compressedPdf }, [compressedPdf]);
                break;

            case 'extractPages':
                const extractedPdf = await extractPages(data.pdfBytes, data.pageNumbers);
                postMessage({ type: 'extractPages', id, success: true, result: extractedPdf }, [extractedPdf]);
                break;

            case 'rotatePage':
                const rotatedPdf = await rotatePage(data.pdfBytes, data.pageNumber, data.degrees);
                postMessage({ type: 'rotatePage', id, success: true, result: rotatedPdf }, [rotatedPdf]);
                break;

            case 'getPageCount':
                const pageCount = await getPageCount(data.pdfBytes);
                postMessage({ type: 'getPageCount', id, success: true, result: pageCount });
                break;

            case 'generateThumbnail':
                const thumbnail = await generateThumbnail(data.pdfBytes, data.pageIndex, data.scale);
                postMessage({ type: 'generateThumbnail', id, success: true, result: thumbnail });
                break;

            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    } catch (error) {
        postMessage({
            type,
            id,
            success: false,
            error: error.message || 'Unknown error in worker'
        });
    }
});

async function initializeLibraries(libPaths) {
    try {
        // Import PDF-LIB
        if (libPaths.pdfLib) {
            importScripts(libPaths.pdfLib);
            pdfLib = self.PDFLib;
        }

        // Import PDF.js
        if (libPaths.pdfjsLib) {
            importScripts(libPaths.pdfjsLib);
            pdfjsLib = self['pdfjs-dist/build/pdf'];
            if (pdfjsLib && libPaths.pdfjsWorker) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = libPaths.pdfjsWorker;
                pdfjsLib.GlobalWorkerOptions.verbosity = 0;
            }
        }

        return true;
    } catch (error) {
        console.error('Error initializing libraries:', error);
        throw error;
    }
}

async function mergePdfs(files, options) {
    if (!pdfLib) throw new Error('PDF-LIB not initialized');

    const { PDFDocument } = pdfLib;
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const pdfDoc = await PDFDocument.load(file.data);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    return mergedBytes.buffer;
}

async function compressPdf(pdfBytes, quality) {
    if (!pdfjsLib) throw new Error('PDF.js not initialized');
    if (!pdfLib) throw new Error('PDF-LIB not initialized');

    const qualityMap = {
        high:   { scale: 1.5, jpegQuality: 0.85 },
        medium: { scale: 1.2, jpegQuality: 0.70 },
        low:    { scale: 1.0, jpegQuality: 0.50 }
    };
    const { scale, jpegQuality } = qualityMap[quality] || qualityMap.medium;

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdfSource = await loadingTask.promise;
    const pageCount = pdfSource.numPages;

    const { PDFDocument } = pdfLib;
    const outputPdf = await PDFDocument.create();

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdfSource.getPage(i);
        const viewport = page.getViewport({ scale });
        const w = Math.round(viewport.width);
        const h = Math.round(viewport.height);

        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: jpegQuality });
        const jpegBytes = new Uint8Array(await blob.arrayBuffer());

        const jpegImage = await outputPdf.embedJpg(jpegBytes);
        const pdfPage = outputPdf.addPage([w, h]);
        pdfPage.drawImage(jpegImage, { x: 0, y: 0, width: w, height: h });
    }

    const compressedBytes = await outputPdf.save();
    return compressedBytes.buffer;
}

async function extractPages(pdfBytes, pageNumbers) {
    if (!pdfLib) throw new Error('PDF-LIB not initialized');

    const { PDFDocument } = pdfLib;
    const srcDoc = await PDFDocument.load(pdfBytes);
    const newDoc = await PDFDocument.create();

    // Convert 1-indexed to 0-indexed
    const indices = pageNumbers.map(n => n - 1);
    const pages = await newDoc.copyPages(srcDoc, indices);
    pages.forEach(page => newDoc.addPage(page));

    const extractedBytes = await newDoc.save();
    return extractedBytes.buffer;
}

async function rotatePage(pdfBytes, pageNumber, degrees) {
    if (!pdfLib) throw new Error('PDF-LIB not initialized');

    const { PDFDocument, degrees: degreesFn } = pdfLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(pageNumber - 1);

    page.setRotation(degreesFn(degrees));

    const rotatedBytes = await pdfDoc.save();
    return rotatedBytes.buffer;
}

async function getPageCount(pdfBytes) {
    if (!pdfLib) throw new Error('PDF-LIB not initialized');

    const { PDFDocument } = pdfLib;
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
}

async function generateThumbnail(pdfBytes, pageIndex, scale = 1.0) {
    if (!pdfjsLib) throw new Error('PDF.js not initialized');

    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageIndex + 1);

    const viewport = page.getViewport({ scale });
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await blob.arrayBuffer();

    return arrayBuffer;
}

// Signal that worker is ready
postMessage({ type: 'ready', success: true });
