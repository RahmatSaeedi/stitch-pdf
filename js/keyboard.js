// Keyboard shortcuts handler
let dotNetHelper = null;
let keyboardListenerAttached = false;

export function initializeKeyboardShortcuts(dotNetRef) {
    dotNetHelper = dotNetRef;

    if (!keyboardListenerAttached) {
        document.addEventListener('keydown', handleKeyDown);
        keyboardListenerAttached = true;
    }
}

export function disposeKeyboardShortcuts() {
    if (keyboardListenerAttached) {
        document.removeEventListener('keydown', handleKeyDown);
        keyboardListenerAttached = false;
    }
    dotNetHelper = null;
}

function handleKeyDown(event) {
    // Don't trigger shortcuts when typing in input fields (except Escape and navigation keys)
    const target = event.target;
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (isInputField && event.key !== 'Escape' && event.key !== 'Enter') {
        return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;
    const shiftKey = event.shiftKey;
    const altKey = event.altKey;

    // Ctrl/Cmd + O: Open file dialog
    if (modifierKey && event.key === 'o' && !shiftKey && !altKey) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnOpenFiles');
        }
        return;
    }

    // Ctrl/Cmd + M: Merge files
    if (modifierKey && event.key === 'm' && !shiftKey && !altKey) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnMerge');
        }
        return;
    }

    // Ctrl/Cmd + S: Save/Download (prevent browser save)
    if (modifierKey && event.key === 's' && !shiftKey && !altKey) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnMerge');
        }
        return;
    }

    // Ctrl/Cmd + Z: Undo
    if (modifierKey && event.key === 'z' && !shiftKey && !altKey) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnUndo');
        }
        return;
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
    if ((modifierKey && shiftKey && event.key === 'z') || (modifierKey && event.key === 'y' && !shiftKey && !altKey)) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnRedo');
        }
        return;
    }

    // Ctrl/Cmd + D: Toggle Dark Mode
    if (modifierKey && event.key === 'd' && !shiftKey && !altKey) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnToggleDarkMode');
        }
        return;
    }

    // Delete: Remove selected file
    if (event.key === 'Delete' && !modifierKey && !shiftKey && !altKey && !isInputField) {
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnDeleteSelected');
        }
        return;
    }

    // Ctrl/Cmd + A: Select all files
    if (modifierKey && event.key === 'a' && !shiftKey && !altKey && !isInputField) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnSelectAll');
        }
        return;
    }

    // Escape: Clear all files or close dialogs
    if (event.key === 'Escape') {
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnEscape');
        }
        return;
    }

    // Ctrl/Cmd + P: Print
    if (modifierKey && event.key === 'p' && !shiftKey && !altKey) {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnPrint');
        }
        return;
    }

    // Ctrl/Cmd + /: Show help
    if (modifierKey && event.key === '/') {
        event.preventDefault();
        if (dotNetHelper) {
            dotNetHelper.invokeMethodAsync('OnShowHelp');
        }
        return;
    }

    // Arrow keys: Navigate (only when not in input fields)
    if (!modifierKey && !shiftKey && !altKey && !isInputField) {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (dotNetHelper) {
                dotNetHelper.invokeMethodAsync('OnNavigateUp');
            }
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (dotNetHelper) {
                dotNetHelper.invokeMethodAsync('OnNavigateDown');
            }
            return;
        }
    }
}

// Get keyboard shortcut hints based on platform
export function getShortcutHints() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? '⌘' : 'Ctrl';

    return {
        openFiles: `${mod}+O`,
        merge: `${mod}+M`,
        save: `${mod}+S`,
        undo: `${mod}+Z`,
        redo: `${mod}+Shift+Z / ${mod}+Y`,
        darkMode: `${mod}+D`,
        delete: 'Delete',
        selectAll: `${mod}+A`,
        escape: 'Esc',
        print: `${mod}+P`,
        help: `${mod}+/`,
        navigate: '↑ ↓ Arrow Keys'
    };
}
