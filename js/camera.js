// Camera capture functionality
let stream = null;
let videoElement = null;

export async function startCamera(videoElementId) {
    try {
        // Wait a bit for the DOM to be fully ready (iOS fix)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get video element
        videoElement = document.getElementById(videoElementId);
        if (!videoElement) {
            console.error("Video element not found with ID:", videoElementId);
            throw new Error("Video element not found");
        }

        console.log("Starting camera for iOS/mobile device...");

        // iOS-friendly camera constraints
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Prefer back camera
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 }
            },
            audio: false
        };

        // Request camera access
        console.log("Requesting camera permission...");
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Camera permission granted, stream obtained");

        // Set up video element
        videoElement.srcObject = stream;
        videoElement.setAttribute('autoplay', '');
        videoElement.setAttribute('playsinline', ''); // Critical for iOS
        videoElement.setAttribute('muted', ''); // Required for autoplay on some devices

        // Ensure video metadata is loaded before playing
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000);

            videoElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                console.log("Video metadata loaded");
                resolve();
            };

            videoElement.onerror = (e) => {
                clearTimeout(timeout);
                console.error("Video element error:", e);
                reject(e);
            };
        });

        // Play the video
        console.log("Attempting to play video...");
        const playPromise = videoElement.play();

        if (playPromise !== undefined) {
            await playPromise;
            console.log("Video playing successfully");
        }

        // Verify video is actually playing
        await new Promise(resolve => setTimeout(resolve, 100));

        if (videoElement.paused) {
            console.warn("Video is paused, attempting to play again...");
            await videoElement.play();
        }

        console.log("Camera started successfully");
        return true;
    } catch (error) {
        console.error("Error starting camera:", error.name, error.message, error);

        // Clean up on error
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

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
