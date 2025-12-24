// Bridge between C# and Web Worker for PDF processing

let worker = null;
let dotNetRef = null;

export function initializeWorker(dotNetReference, libPaths) {
    return new Promise((resolve, reject) => {
        try {
            dotNetRef = dotNetReference;

            // Create worker
            worker = new Worker('./js/pdfWorker.js');

            // Handle messages from worker
            worker.onmessage = (e) => {
                const { type, id, success, result, error } = e.data;

                if (type === 'ready') {
                    // Worker is ready, now initialize libraries
                    worker.postMessage({
                        type: 'init',
                        id: 'init',
                        data: { libPaths }
                    });
                } else if (type === 'init') {
                    // Initialization complete
                    resolve(success);
                } else {
                    // Task result
                    if (dotNetRef) {
                        dotNetRef.invokeMethodAsync('OnWorkerMessage', type, id, success, result, error);
                    }
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                if (dotNetRef) {
                    dotNetRef.invokeMethodAsync('OnWorkerMessage', 'error', 'error', false, null, error.message);
                }
                reject(error);
            };

        } catch (error) {
            console.error('Error creating worker:', error);
            reject(error);
        }
    });
}

export function postTask(type, id, data) {
    if (!worker) {
        throw new Error('Worker not initialized');
    }

    worker.postMessage({
        type,
        id,
        data
    });
}

export function terminateWorker() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    dotNetRef = null;
}

export function isWorkerSupported() {
    return typeof(Worker) !== 'undefined';
}
