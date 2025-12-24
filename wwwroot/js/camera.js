// Camera capture functionality
let stream = null;
let videoElement = null;

export async function startCamera(videoElementId) {
    try {
        // Get video element
        videoElement = document.getElementById(videoElementId);
        if (!videoElement) {
            throw new Error("Video element not found");
        }

        // Request camera access with high resolution
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        videoElement.srcObject = stream;
        await videoElement.play();

        return true;
    } catch (error) {
        console.error("Error starting camera:", error);
        return false;
    }
}

export function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

export function capturePhoto(videoElementId, canvasElementId) {
    try {
        const video = document.getElementById(videoElementId);
        const canvas = document.getElementById(canvasElementId);

        if (!video || !canvas) {
            throw new Error("Video or canvas element not found");
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob and return as data URL
        return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
        console.error("Error capturing photo:", error);
        return null;
    }
}

export async function checkCameraAvailability() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return false;
        }

        // Check if we have permission or can request it
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');

        return hasCamera;
    } catch (error) {
        console.error("Error checking camera availability:", error);
        return false;
    }
}
