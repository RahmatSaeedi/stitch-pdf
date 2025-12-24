// OCR functionality using Tesseract.js
let ocrWorker = null;

// Initialize Tesseract worker
export async function initializeOCR(language = 'eng') {
    try {
        if (!window.Tesseract) {
            console.error('Tesseract.js not loaded');
            throw new Error('Tesseract.js library not loaded. Please refresh the page.');
        }

        // Create worker with explicit CDN paths for proper CORS support
        ocrWorker = await Tesseract.createWorker(language, 1, {
            errorHandler: (err) => console.error('[Tesseract Error]', err),
            // Use official tessdata CDN for language data (has CORS enabled)
            langPath: 'https://tessdata.projectnaptha.com/4.0.0',
            // Use jsDelivr for worker and core files
            workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
            corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js'
        });
        return true;
    } catch (error) {
        console.error('Error initializing OCR:', error);
        throw new Error(`OCR initialization failed: ${error.message}`);
    }
}

// Perform OCR on image bytes
export async function performOCR(imageBytes, language = 'eng', dotNetRef = null) {
    try {
        // Initialize if not already done
        if (!ocrWorker) {
            await initializeOCR(language);
        }

        // Create blob from bytes
        const blob = new Blob([imageBytes], { type: 'image/png' });

        // Perform OCR
        const result = await ocrWorker.recognize(blob);

        return {
            text: result.data.text,
            confidence: result.data.confidence,
            words: result.data.words.map(w => ({
                text: w.text,
                confidence: w.confidence,
                bbox: w.bbox
            })),
            lines: result.data.lines.map(l => ({
                text: l.text,
                confidence: l.confidence,
                bbox: l.bbox
            }))
        };
    } catch (error) {
        console.error('Error performing OCR:', error);
        return {
            text: '',
            confidence: 0,
            words: [],
            lines: [],
            error: error.message
        };
    }
}

// Perform OCR on PDF pages
export async function performOCROnPDF(pdfBytes, language = 'eng', dotNetRef = null) {
    try {
        // Load PDF
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;

        const results = [];

        // Process each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            if (dotNetRef) {
                dotNetRef.invokeMethodAsync('OnPDFOCRProgress', pageNum, pdf.numPages);
            }

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });

            // Create canvas for page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Convert canvas to image bytes
            const imageData = canvas.toDataURL('image/png');
            const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());

            // Perform OCR on page
            const pageResult = await performOCR(new Uint8Array(imageBytes), language, null);

            results.push({
                pageNumber: pageNum,
                text: pageResult.text,
                confidence: pageResult.confidence,
                words: pageResult.words,
                lines: pageResult.lines
            });
        }

        return {
            success: true,
            pages: results,
            totalPages: pdf.numPages
        };
    } catch (error) {
        console.error('Error performing OCR on PDF:', error);
        return {
            success: false,
            error: error.message,
            pages: [],
            totalPages: 0
        };
    }
}

// Make PDF searchable by adding text layer
export async function makePDFSearchable(pdfBytes, ocrResults) {
    try {
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        for (let i = 0; i < ocrResults.pages.length && i < pages.length; i++) {
            const page = pages[i];
            const pageOCR = ocrResults.pages[i];

            // Add invisible text layer over scanned image
            const { width, height } = page.getSize();

            for (const line of pageOCR.lines) {
                const bbox = line.bbox;

                // Calculate position and size (simplified)
                const x = (bbox.x0 / bbox.x1) * width;
                const y = height - ((bbox.y0 / bbox.y1) * height);

                // Draw invisible text
                page.drawText(line.text, {
                    x: x,
                    y: y,
                    size: 8,
                    opacity: 0, // Invisible
                    color: PDFLib.rgb(0, 0, 0)
                });
            }
        }

        const modifiedPdfBytes = await pdfDoc.save();
        return new Uint8Array(modifiedPdfBytes);
    } catch (error) {
        console.error('Error making PDF searchable:', error);
        return null;
    }
}

// Get supported languages (110 languages covering 95%+ of internet users)
export function getSupportedLanguages() {
    return [
        // Most Common Languages
        { code: 'eng', name: 'English' },
        { code: 'chi_sim', name: 'Chinese (Simplified)' },
        { code: 'chi_tra', name: 'Chinese (Traditional)' },
        { code: 'spa', name: 'Spanish' },
        { code: 'ara', name: 'Arabic' },
        { code: 'por', name: 'Portuguese' },
        { code: 'ind', name: 'Indonesian' },
        { code: 'fra', name: 'French' },
        { code: 'jpn', name: 'Japanese' },
        { code: 'rus', name: 'Russian' },

        // European Languages
        { code: 'deu', name: 'German' },
        { code: 'ita', name: 'Italian' },
        { code: 'pol', name: 'Polish' },
        { code: 'tur', name: 'Turkish' },
        { code: 'nld', name: 'Dutch' },
        { code: 'ukr', name: 'Ukrainian' },
        { code: 'ron', name: 'Romanian' },
        { code: 'ell', name: 'Greek' },
        { code: 'ces', name: 'Czech' },
        { code: 'swe', name: 'Swedish' },
        { code: 'hun', name: 'Hungarian' },
        { code: 'bel', name: 'Belarusian' },
        { code: 'bul', name: 'Bulgarian' },
        { code: 'hrv', name: 'Croatian' },
        { code: 'dan', name: 'Danish' },
        { code: 'est', name: 'Estonian' },
        { code: 'fin', name: 'Finnish' },
        { code: 'glg', name: 'Galician' },
        { code: 'isl', name: 'Icelandic' },
        { code: 'lav', name: 'Latvian' },
        { code: 'lit', name: 'Lithuanian' },
        { code: 'mkd', name: 'Macedonian' },
        { code: 'nor', name: 'Norwegian' },
        { code: 'slk', name: 'Slovak' },
        { code: 'slv', name: 'Slovenian' },
        { code: 'srp', name: 'Serbian' },
        { code: 'cat', name: 'Catalan' },
        { code: 'eus', name: 'Basque' },
        { code: 'sqi', name: 'Albanian' },
        { code: 'aze', name: 'Azerbaijani' },
        { code: 'bos', name: 'Bosnian' },
        { code: 'cym', name: 'Welsh' },
        { code: 'gle', name: 'Irish' },
        { code: 'gla', name: 'Scottish Gaelic' },

        // Asian Languages
        { code: 'kor', name: 'Korean' },
        { code: 'vie', name: 'Vietnamese' },
        { code: 'tha', name: 'Thai' },
        { code: 'msa', name: 'Malay' },
        { code: 'tgl', name: 'Tagalog (Filipino)' },
        { code: 'jav', name: 'Javanese' },
        { code: 'sun', name: 'Sundanese' },
        { code: 'ceb', name: 'Cebuano' },
        { code: 'khm', name: 'Khmer' },
        { code: 'lao', name: 'Lao' },
        { code: 'mya', name: 'Burmese (Myanmar)' },
        { code: 'bod', name: 'Tibetan' },
        { code: 'mon', name: 'Mongolian' },
        { code: 'dzo', name: 'Dzongkha' },

        // Indian Subcontinent
        { code: 'hin', name: 'Hindi' },
        { code: 'ben', name: 'Bengali' },
        { code: 'tam', name: 'Tamil' },
        { code: 'tel', name: 'Telugu' },
        { code: 'mar', name: 'Marathi' },
        { code: 'guj', name: 'Gujarati' },
        { code: 'kan', name: 'Kannada' },
        { code: 'mal', name: 'Malayalam' },
        { code: 'pan', name: 'Punjabi' },
        { code: 'urd', name: 'Urdu' },
        { code: 'ori', name: 'Oriya' },
        { code: 'asm', name: 'Assamese' },
        { code: 'nep', name: 'Nepali' },
        { code: 'sin', name: 'Sinhala' },
        { code: 'san', name: 'Sanskrit' },
        { code: 'snd', name: 'Sindhi' },
        { code: 'kas', name: 'Kashmiri' },
        { code: 'kok', name: 'Konkani' },
        { code: 'mni', name: 'Manipuri' },
        { code: 'sat', name: 'Santali' },

        // Middle Eastern & Central Asian
        { code: 'fas', name: 'Persian (Farsi)' },
        { code: 'heb', name: 'Hebrew' },
        { code: 'pus', name: 'Pashto' },
        { code: 'kur', name: 'Kurdish' },
        { code: 'uig', name: 'Uyghur' },
        { code: 'syr', name: 'Syriac' },
        { code: 'tuk', name: 'Turkmen' },
        { code: 'kir', name: 'Kyrgyz' },
        { code: 'tgk', name: 'Tajik' },

        // African Languages
        { code: 'afr', name: 'Afrikaans' },
        { code: 'swa', name: 'Swahili' },
        { code: 'amh', name: 'Amharic' },
        { code: 'som', name: 'Somali' },
        { code: 'tir', name: 'Tigrinya' },
        { code: 'yor', name: 'Yoruba' },
        { code: 'hau', name: 'Hausa' },
        { code: 'ibo', name: 'Igbo' },
        { code: 'orm', name: 'Oromo' },
        { code: 'zul', name: 'Zulu' },
        { code: 'xho', name: 'Xhosa' },

        // Other Languages
        { code: 'hye', name: 'Armenian' },
        { code: 'kat', name: 'Georgian' },
        { code: 'kaz', name: 'Kazakh' },
        { code: 'uzb', name: 'Uzbek' },
        { code: 'yid', name: 'Yiddish' },
        { code: 'mlt', name: 'Maltese' },
        { code: 'fry', name: 'Frisian' },
        { code: 'oci', name: 'Occitan' },
        { code: 'bre', name: 'Breton' },
        { code: 'epo', name: 'Esperanto' },
        { code: 'lat', name: 'Latin' }
    ];
}

// Cleanup
export async function disposeOCR() {
    if (ocrWorker) {
        await ocrWorker.terminate();
        ocrWorker = null;
    }
}
