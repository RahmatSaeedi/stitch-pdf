// Network status monitoring
let dotNetRef = null;
let isOnline = navigator.onLine;

export function initialize(dotNetReference) {
    dotNetRef = dotNetReference;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return current status
    return isOnline;
}

function handleOnline() {
    isOnline = true;
    if (dotNetRef) {
        dotNetRef.invokeMethodAsync('OnNetworkStatusChanged', true);
    }
}

function handleOffline() {
    isOnline = false;
    if (dotNetRef) {
        dotNetRef.invokeMethodAsync('OnNetworkStatusChanged', false);
    }
}

export function dispose() {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    dotNetRef = null;
}

export function getNetworkStatus() {
    return isOnline;
}
