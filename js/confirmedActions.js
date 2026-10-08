import { isStoreReady, getStoreUserId } from './store.js';
import { showToast } from './ui.js';
import { t } from './i18n.js';

let busy = false;
export const isActionBusy = () => busy;

// O botão fica em espera até a resposta, sem depender da duração de um toast.
export async function runConfirmedAction(control, action, options = {}) {
    if (busy) { showToast(t('actionWait')); return false; }
    if (!isStoreReady()) {
        showToast('Conecte e atualize os dados antes de fazer alterações.');
        return false;
    }
    const userId = getStoreUserId();
    busy = true;
    const scope = control?.closest?.('form') || control;
    const controls = scope?.querySelectorAll ? [...scope.querySelectorAll('input, select, button, textarea')] : [];
    if (control && 'disabled' in control && !controls.includes(control)) controls.push(control);
    const previous = controls.map(element => [element, element.disabled]);
    const button = control?.tagName === 'BUTTON' ? control : scope?.querySelector?.('button[type="submit"]');
    const oldHTML = button?.innerHTML;
    const oldOpacity = button?.style.opacity;
    const oldBusy = scope?.getAttribute?.('aria-busy');
    for (const [element] of previous) element.disabled = true;
    scope?.setAttribute?.('aria-busy', 'true');
    if (button) {
        button.dataset.confirmedBusy = 'true';
        button.innerText = options.label || t('actionSaving');
        button.style.opacity = '0.7';
    }
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.className = 'text-muted-small';
    status.textContent = options.label || t('actionSaving');
    const statusHost = scope?.tagName === 'BUTTON' ? scope.parentElement : scope;
    statusHost?.appendChild?.(status);
    try {
        await action();
        if (getStoreUserId() !== userId) throw new Error('A sessão mudou. Atualize os dados da conta atual.');
        return true;
    } catch (error) {
        showToast(error?.message || 'Não foi possível confirmar a alteração. Seus campos foram mantidos.');
        return false;
    } finally {
        status.remove();
        if (button) {
            delete button.dataset.confirmedBusy;
            button.innerHTML = oldHTML;
            button.style.opacity = oldOpacity;
        }
        for (const [element, disabled] of previous) element.disabled = disabled;
        if (oldBusy == null) scope?.removeAttribute?.('aria-busy');
        else scope?.setAttribute?.('aria-busy', oldBusy);
        busy = false;
    }
}