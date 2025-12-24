// Keyboard shortcuts handler
let dotNetRef = null;
let keydownHandler = null;

export function initializeKeyboardShortcuts(dotNetReference) {
    dotNetRef = dotNetReference;

    keydownHandler = (event) => {
        const ctrl = event.ctrlKey || event.metaKey;
        const shift = event.shiftKey;
        const alt = event.altKey;
        const key = event.key.toLowerCase();

        // Ctrl+O: Open files
        if (ctrl && key === 'o' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'open');
            return;
        }

        // Ctrl+M: Merge files
        if (ctrl && key === 'm' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'merge');
            return;
        }

        // Ctrl+S: Save/Download
        if (ctrl && key === 's' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'save');
            return;
        }

        // Ctrl+Z: Undo
        if (ctrl && key === 'z' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'undo');
            return;
        }

        // Ctrl+Shift+Z or Ctrl+Y: Redo
        if ((ctrl && shift && key === 'z') || (ctrl && key === 'y' && !shift && !alt)) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'redo');
            return;
        }

        // Ctrl+D: Toggle Dark Mode
        if (ctrl && key === 'd' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'toggleDarkMode');
            return;
        }

        // Delete: Remove selected file
        if (key === 'delete' && !ctrl && !shift && !alt) {
            dotNetRef.invokeMethodAsync('HandleShortcut', 'delete');
            return;
        }

        // Ctrl+A: Select all files
        if (ctrl && key === 'a' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'selectAll');
            return;
        }

        // Escape: Close dialogs
        if (key === 'escape' && !ctrl && !shift && !alt) {
            dotNetRef.invokeMethodAsync('HandleShortcut', 'escape');
            return;
        }

        // Ctrl+P: Print
        if (ctrl && key === 'p' && !shift && !alt) {
            event.preventDefault();
            dotNetRef.invokeMethodAsync('HandleShortcut', 'print');
            return;
        }

        // Arrow keys: Navigate
        if (!ctrl && !shift && !alt) {
            if (key === 'arrowup') {
                event.preventDefault();
                dotNetRef.invokeMethodAsync('HandleShortcut', 'navigateUp');
                return;
            }
            if (key === 'arrowdown') {
                event.preventDefault();
                dotNetRef.invokeMethodAsync('HandleShortcut', 'navigateDown');
                return;
            }
        }
    };

    document.addEventListener('keydown', keydownHandler);
}

export function disposeKeyboardShortcuts() {
    if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
    }
    dotNetRef = null;
}
