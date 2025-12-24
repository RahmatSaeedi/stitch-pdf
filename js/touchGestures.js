// Touch gesture handler for mobile devices
let dotNetRef = null;
let touchHandlers = new Map();

class TouchGestureHandler {
    constructor(element, dotNetReference) {
        this.element = element;
        this.dotNetRef = dotNetReference;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.touchStartTime = 0;
        this.longPressTimer = null;
        this.initialDistance = 0;
        this.currentScale = 1;

        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.touchStartTime = Date.now();

            // Start long press timer
            this.longPressTimer = setTimeout(() => {
                this.handleLongPress();
            }, 500); // 500ms for long press
        } else if (e.touches.length === 2) {
            // Two finger touch - prepare for pinch
            this.clearLongPressTimer();
            this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
        }
    }

    handleTouchMove(e) {
        this.clearLongPressTimer();

        if (e.touches.length === 2) {
            // Pinch gesture
            e.preventDefault();
            const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
            const scale = currentDistance / this.initialDistance;

            if (Math.abs(scale - 1) > 0.1) {
                this.handlePinch(scale);
                this.initialDistance = currentDistance;
            }
        }
    }

    handleTouchEnd(e) {
        this.clearLongPressTimer();

        if (e.changedTouches.length === 1) {
            this.touchEndX = e.changedTouches[0].clientX;
            this.touchEndY = e.changedTouches[0].clientY;

            const deltaX = this.touchEndX - this.touchStartX;
            const deltaY = this.touchEndY - this.touchStartY;
            const deltaTime = Date.now() - this.touchStartTime;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Check for swipe (minimum 50px and within 300ms)
            if (distance > 50 && deltaTime < 300) {
                this.handleSwipe(deltaX, deltaY);
            }
            // Check for tap (short distance and time)
            else if (distance < 10 && deltaTime < 200) {
                this.handleTap();
            }
        }
    }

    handleSwipe(deltaX, deltaY) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        let direction;
        if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        if (this.dotNetRef) {
            this.dotNetRef.invokeMethodAsync('OnSwipe', direction);
        }
    }

    handleTap() {
        if (this.dotNetRef) {
            this.dotNetRef.invokeMethodAsync('OnTap');
        }
    }

    handleLongPress() {
        if (this.dotNetRef) {
            this.dotNetRef.invokeMethodAsync('OnLongPress');
        }
    }

    handlePinch(scale) {
        if (this.dotNetRef) {
            this.dotNetRef.invokeMethodAsync('OnPinch', scale);
        }
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    dispose() {
        this.clearLongPressTimer();
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
    }
}

export function initializeTouchGestures(elementId, dotNetReference) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element ${elementId} not found`);
        return false;
    }

    const handler = new TouchGestureHandler(element, dotNetReference);
    touchHandlers.set(elementId, handler);
    dotNetRef = dotNetReference;

    return true;
}

export function disposeTouchGestures(elementId) {
    const handler = touchHandlers.get(elementId);
    if (handler) {
        handler.dispose();
        touchHandlers.delete(elementId);
    }
}

export function disposeAllTouchGestures() {
    touchHandlers.forEach(handler => handler.dispose());
    touchHandlers.clear();
    dotNetRef = null;
}

export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
