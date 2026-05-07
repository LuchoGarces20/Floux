export function initSwipeActions(listaElement, config, callbacks) {
    let startX = 0;
    let startY = 0;
    let activeItem = null;
    let initialTranslateX = 0;
    let isSwiping = false;

    listaElement.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('.swipe-content');
        if (!target) return;

        if (activeItem && activeItem !== target) {
            activeItem.style.transform = 'translateX(0px)';
            activeItem.dataset.open = "false";
        }

        startX = e.clientX;
        startY = e.clientY;
        activeItem = target;
        isSwiping = false;
        initialTranslateX = activeItem.dataset.open === "true" ? config.MAX_PX : 0;
        activeItem.classList.add('no-transition');
        activeItem.setPointerCapture(e.pointerId);
    });

    listaElement.addEventListener('pointermove', (e) => {
        if (!activeItem) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > config.MIN_DRAG_PX) {
            activeItem.releasePointerCapture(e.pointerId);
            activeItem.classList.remove('no-transition');
            activeItem = null;
            return;
        }

        if (Math.abs(deltaX) > config.MIN_DRAG_PX) isSwiping = true;

        if (isSwiping) {
            let translateX = initialTranslateX + deltaX;
            translateX = Math.max(config.MAX_PX, Math.min(0, translateX));
            activeItem.style.transform = `translateX(${translateX}px)`;
        }
    });

    listaElement.addEventListener('pointerup', (e) => {
        if (!activeItem) return;

        activeItem.classList.remove('no-transition');
        activeItem.releasePointerCapture(e.pointerId);

        if (isSwiping) {
            const transformStr = activeItem.style.transform;
            const match = transformStr.match(/translateX\(([-0-9.]+)px\)/);
            const currentTranslateX = match ? parseFloat(match[1]) : 0;

            if (currentTranslateX < config.THRESHOLD_PX) {
                activeItem.style.transform = `translateX(${config.MAX_PX}px)`;
                activeItem.dataset.open = "true";
                if (navigator.vibrate) navigator.vibrate(15);
            } else {
                activeItem.style.transform = `translateX(0px)`;
                activeItem.dataset.open = "false";
                if (initialTranslateX === 0) activeItem = null;
            }
        } else {
            const isOpen = activeItem.dataset.open === "true";
            if (isOpen) {
                activeItem.style.transform = `translateX(0px)`;
                activeItem.dataset.open = "false";
                activeItem = null;
            } else {
                activeItem.style.transform = `translateX(${config.MAX_PX}px)`;
                activeItem.dataset.open = "true";
            }
        }
    });

    listaElement.addEventListener('click', (e) => {
        const btnDelete = e.target.closest('.delete-btn');
        const btnEdit = e.target.closest('.edit-btn');

        if (activeItem && (btnDelete || btnEdit)) {
            activeItem.style.transform = `translateX(0px)`;
            activeItem.dataset.open = "false";
            activeItem = null;
        }

        if (btnDelete && callbacks.onDelete) callbacks.onDelete(parseInt(btnDelete.getAttribute('data-id'), 10));
        else if (btnEdit && callbacks.onEdit) callbacks.onEdit(parseInt(btnEdit.getAttribute('data-id'), 10));
    });
}