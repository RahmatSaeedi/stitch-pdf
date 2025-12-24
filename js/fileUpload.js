export function initializeFileUploadZone(element) {
    if (!element) {
        return;
    }

    // Find the file input element
    const inputElement = element.querySelector('input[type="file"]');
    if (!inputElement) {
        return;
    }

    // Make entire zone clickable
    const clickHandler = (e) => {
        // Don't trigger click if the target is already the input element or a child of it
        if (e.target === inputElement || inputElement.contains(e.target)) {
            return;
        }
        // Prevent default and stop propagation to avoid double-triggers
        e.preventDefault();
        e.stopPropagation();
        // Trigger the file input click
        inputElement.click();
    };
    element.addEventListener('click', clickHandler);

    // Handle drag events to prevent browser from opening files
    const dragOverHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        element.classList.add('drag-over');
    };
    element.addEventListener('dragover', dragOverHandler);

    const dragEnterHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.classList.add('drag-over');
    };
    element.addEventListener('dragenter', dragEnterHandler);

    const dragLeaveHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove if leaving the element entirely
        const rect = element.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right ||
            e.clientY < rect.top || e.clientY >= rect.bottom) {
            element.classList.remove('drag-over');
        }
    };
    element.addEventListener('dragleave', dragLeaveHandler);

    const dropHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.classList.remove('drag-over');

        // Transfer files to the input element
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Manually set files on the input and trigger change event
            inputElement.files = e.dataTransfer.files;
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };
    element.addEventListener('drop', dropHandler);

    return true;
}

export function cleanupFileUploadZone(element) {
    if (element) {
        element.classList.remove('drag-over');
    }
}
