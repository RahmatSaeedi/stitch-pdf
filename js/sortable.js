// Custom sortable implementation using SortableJS
let sortableInstance = null;

export function initializeSortable(element, dotNetHelper) {
    if (!element) {
        return;
    }

    // Destroy existing instance if any
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    // Initialize Sortable
    sortableInstance = Sortable.create(element, {
        animation: 200,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        handle: '.sortable-handle',
        forceFallback: false,
        swapThreshold: 0.65,
        direction: 'horizontal',

        // Called when dragging ends
        onEnd: async function(evt) {
            if (evt.oldIndex !== evt.newIndex) {
                const oldIdx = evt.oldIndex;
                const newIdx = evt.newIndex;

                // Immediately revert the DOM change that Sortable made
                // We'll let Blazor handle the actual reordering
                const parent = evt.from;
                const item = evt.item;

                // Get all children as array
                const children = Array.from(parent.children);

                // Remove the item from its current position (where Sortable put it)
                parent.removeChild(item);

                // Put it back at the old position
                if (oldIdx >= children.length - 1) {
                    parent.appendChild(item);
                } else {
                    // We need to account for the fact that we removed the item
                    const referenceNode = children[oldIdx < newIdx ? oldIdx : oldIdx + 1];
                    parent.insertBefore(item, referenceNode);
                }

                try {
                    // Now tell Blazor to update
                    await dotNetHelper.invokeMethodAsync('OnItemMoved', oldIdx, newIdx);
                } catch (error) {
                    console.error('Error calling OnItemMoved:', error);
                }
            }
        }
    });

    return true;
}

export function destroySortable() {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
}
