// PWA Registration and Installation
let deferredPrompt;
let installButton;

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt fired');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button
    showInstallPromotion();
});

// Handle app installed
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    hideInstallPromotion();
});

// Show install promotion
function showInstallPromotion() {
    // This will be called from Blazor component
    if (window.DotNet) {
        window.DotNet.invokeMethodAsync('PdfMerger.Client', 'OnPWAInstallAvailable')
            .catch(err => console.log('PWA install notification not available yet'));
    }
}

// Hide install promotion
function hideInstallPromotion() {
    if (window.DotNet) {
        window.DotNet.invokeMethodAsync('PdfMerger.Client', 'OnPWAInstalled')
            .catch(err => console.log('PWA installed notification not available yet'));
    }
}

// Install PWA
export async function installPWA() {
    if (!deferredPrompt) {
        console.log('Install prompt not available');
        return false;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Clear the deferred prompt
    deferredPrompt = null;

    return outcome === 'accepted';
}

// Check if app is installed
export function isPWAInstalled() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    // Check if running as iOS PWA
    if (window.navigator.standalone === true) {
        return true;
    }
    return false;
}

// Get install availability
export function canInstallPWA() {
    return deferredPrompt !== null;
}

// Share API for sharing PDFs
export async function sharePDF(fileName, pdfBytes) {
    if (!navigator.share) {
        console.log('Web Share API not supported');
        return false;
    }

    try {
        const file = new File([pdfBytes], fileName, { type: 'application/pdf' });
        await navigator.share({
            files: [file],
            title: 'Shared PDF',
            text: 'Check out this PDF'
        });
        return true;
    } catch (err) {
        console.error('Error sharing:', err);
        return false;
    }
}
