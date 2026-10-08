// js/main.js
import { state, loadStore, saveStore, STORAGE_KEYS, confirmCreatedExpense, createExpensesOnce, updateExpense, removeExpense, updateCuentaStatus, removeMultipleExpenses, subscribe, updateProfile, addCuenta, removeCuenta, addBoleto, removeBoleto, resetSession, getStoreUserId, isStoreReady, markStoreReady, applyRemoteSnapshot, clearCurrentUserCache, nextRecordId, eraseUserData, hasUserData } from './store.js';
import { currentLang, t, setLangStr, formatCurrency } from './i18n.js';
import { aplicarTraduccion, renderizarSelectCategorias, renderCuentasList, renderBoletosList, actualizarInterfaz, resetFormularioGasto, showToast, setFiltroHistorial, resetFiltrosHistorialState, toggleMostrarTodosGastos, limparDiaCalendario, setModoEdicionGasto, getHistoryText } from './ui.js';
import { initSwipeActions } from './swipeHandler.js';
import { getUser, signInWithEmail, signUpWithEmail, signOutUser, pullSupabaseToLocalState, onAuthChange, getEraseReceiptFromSupabase, getExpenseReceiptFromSupabase } from './supabaseClient.js';
import { runConfirmedAction, isActionBusy } from './confirmedActions.js';
import { getCreationDraft, getPendingCreation, completeCreation, clearCreationDrafts, getExpenseCreationDraft } from './creationDrafts.js';

const INTERACTION_CONFIG = {
    KEYBOARD_FOCUS_DELAY_MS: 300,
    DEBOUNCE_DELAY_MS: 300,
    SWIPE: { MAX_PX: -110, THRESHOLD_PX: -40, MIN_DRAG_PX: 5 },
    HAPTICS: { SHORT_MS: 15, DELETE_PATTERN_MS: [30, 50, 30] }
};

let gastoEnEdicion = null;
let gastoOriginalEnEdicion = null;

const setGastoEnEdicion = (val) => {
    gastoEnEdicion = val;
    gastoOriginalEnEdicion = val === null
        ? null
        : state.historialGlobal.find(g => g.id === val) || null;
    setModoEdicionGasto(val !== null);
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if (btnCancelar) {
        btnCancelar.innerText = getHistoryText('cancelEdit');
        btnCancelar.classList.toggle('oculto', val === null);
    }
};

function fechaLocalInput(fecha) {
    const date = new Date(fecha);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const hoy = new Date();
const mesActual = hoy.getMonth();
const anoActual = hoy.getFullYear();

let viewMonth = mesActual;
let viewYear = anoActual;
let modoActual = 'directo';
let presupuestoCalculadoTemporalCents = 0;

// O store grava o cache depois de confirmar cada operação. Renderizar não envia perfil.
subscribe((property) => {
    if (property === 'privacyMode') actualizarModoPrivacidade();
    if (!document.getElementById('pantalla-principal').classList.contains('oculto')) {
        actualizarInterfaz(state, viewMonth, viewYear, hoy);
    }
});
window.addEventListener('floux-cache-warning', e => showToast(e.detail.message));

let initRevision = 0;
let recoveryNotice = '';
const connectionStatus = document.createElement('div');
connectionStatus.id = 'floux-connection-status';
connectionStatus.setAttribute('role', 'status');
connectionStatus.setAttribute('aria-live', 'polite');
connectionStatus.style.cssText = 'padding:12px;margin:8px 0;border-radius:12px;background:var(--bg-color);color:var(--text-color);font-size:0.9rem;';
document.getElementById('app-movil').prepend(connectionStatus);
function setConnectionStatus(message, retry = false) {
    connectionStatus.replaceChildren();
    connectionStatus.hidden = !message;
    if (!message) return;
    const text = document.createElement('span');
    text.textContent = message;
    connectionStatus.appendChild(text);
    if (retry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-base btn-secundario btn-pequeno';
        button.textContent = 'Atualizar dados';
        button.addEventListener('click', () => {
            if (isActionBusy()) return;
            if (gastoEnEdicion !== null || document.getElementById('input-desc').value.trim() ||
                Number(document.getElementById('input-monto').dataset.cents || 0) > 0) {
                if (!confirm('Atualizar vai recarregar as telas. Deseja descartar o formulário ainda não salvo?')) return;
            }
            init();
        });
        connectionStatus.appendChild(button);
    }
}

// Oculta exclusivamente as secções principais da aplicação
function ocultarTodasPantallas() {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('oculto'));
}

function transicionPantalla(callback) {
    if (!document.startViewTransition) {
        callback();
        return;
    }
    document.startViewTransition(() => {
        callback();
    });
}

const inputIngresos = document.getElementById('input-ingresos');
const inputPctViver = document.getElementById('input-pct-viver');
const inputPctLivre = document.getElementById('input-pct-livre');
const displayCalculado = document.getElementById('display-calculado');
const displayNetSurvival = document.getElementById('display-net-survival');
const displayFreeSpending = document.getElementById('display-free-spending');
const inputMoneda = document.getElementById('input-moneda');
const inputPresupuesto = document.getElementById('input-presupuesto');

const selectCuotas = document.getElementById('select-cuotas');
const inputCuotas = document.getElementById('input-cuotas');

if (selectCuotas && inputCuotas) {
    selectCuotas.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            selectCuotas.classList.add('oculto');
            inputCuotas.classList.remove('oculto');
            inputCuotas.value = '';
            inputCuotas.focus();
        } else {
            inputCuotas.value = e.target.value;
        }
    });
}

const btnPrivacidade = document.getElementById('btn-privacidade');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const settingsDropdown = document.getElementById('settings-dropdown');

if (btnSettingsToggle && settingsDropdown) {
    btnSettingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDropdown.classList.toggle('oculto');
    });
}

const btnLembrete = document.getElementById('btn-lembrete');
if (btnLembrete) {
    btnLembrete.addEventListener('click', async () => {
        if (settingsDropdown) settingsDropdown.classList.add('oculto');
        
        if (!('Notification' in window)) {
            showToast(" " + t('notifUnsupported'));
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast(" " + t('notifActivated'));
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification("Floux", {
                    body: t('notifBody'),
                    icon: './img/logo180.png',
                    badge: './img/logo-floux.svg'
                });
            }
        } else {
            showToast(" " + t('notifDenied'));
        }
    });
}

document.addEventListener('click', async (e) => {
    if (settingsDropdown && !settingsDropdown.classList.contains('oculto')) {
        const isClickInsideMenu = settingsDropdown.contains(e.target);
        const isClickOnToggle = btnSettingsToggle && btnSettingsToggle.contains(e.target);
        if (!isClickInsideMenu && !isClickOnToggle) {
            settingsDropdown.classList.add('oculto');
        }
    }
    
    const btnEliminarBoleto = e.target.closest('.btn-eliminar-boleto');
    if (btnEliminarBoleto) {
        const idDel = btnEliminarBoleto.dataset.id;
        if (!await runConfirmedAction(btnEliminarBoleto, () => removeBoleto(idDel))) return;
        renderBoletosList(state);
        recalcularPresupuestoOnboarding();
        return;
    }
    
    const btnPagar = e.target.closest('.btn-pagar-boleto');
    if (btnPagar) {
        const boletoId = btnPagar.dataset.id;
        const boleto = state.boletos.find(b => b.id === boletoId);
        
        if (boleto) {
            const contaSelect = document.getElementById('input-cuenta-origen');
            const cuentaId = contaSelect ? contaSelect.value : (state.cuentas.length > 0 ? state.cuentas[0].id : null);
            if (!cuentaId) {
                showToast(t('errNoAccountAvailable'));
                return;
            }
            const msgConfirm = t('confirmPayBill')
                .replace('{desc}', boleto.desc)
                .replace('{monto}', formatCurrency(boleto.monto, state.monedaActual));

            if (confirm(msgConfirm)) {
                const draft = getCreationDraft(`bill-payment:${boleto.id}:${new Date().getFullYear()}-${new Date().getMonth()}`);
                if (!await runConfirmedAction(btnPagar, () => confirmCreatedExpense({
                    id: draft.id,
                    monto: boleto.monto,
                    desc: boleto.desc,
                    fecha: draft.createdAt,
                    categoria: boleto.categoria,
                    cuentaId: cuentaId,
                    boletoId: boleto.id
                }))) return;
                completeCreation(draft);
                if (navigator.vibrate) navigator.vibrate(15);
                showToast(" " + t('toastBillPaid'));
                renderBoletosList(state);
                if (!document.getElementById('pantalla-principal').classList.contains('oculto')) {
                    actualizarInterfaz(state, viewMonth, viewYear, hoy);
                }
            }
        }
    }
    
    const btnCuentaToggle = e.target.closest('.btn-toggle-cuenta');
    if (btnCuentaToggle) {
        const idTgt = btnCuentaToggle.dataset.id;
        const cuenta = state.cuentas.find(c => c.id === idTgt);
        if (cuenta) {
            if (!await runConfirmedAction(btnCuentaToggle, () => updateCuentaStatus(idTgt, !cuenta.inactiva))) return;
            renderCuentasList(state);
            // Força a atualização do dashboard para remover contas inativas dos selects
            if (!document.getElementById('pantalla-principal').classList.contains('oculto')) {
                actualizarInterfaz(state, viewMonth, viewYear, hoy);
            }
        }
        return;
    }
});

function actualizarModoPrivacidade() {
    if (!btnPrivacidade) return;
    if (state.privacyMode) {
        document.body.classList.add('privacy-mode');
        btnPrivacidade.innerText = '🙈';
    } else {
        document.body.classList.remove('privacy-mode');
        btnPrivacidade.innerText = '👁️';
    }
}

if (btnPrivacidade) {
    btnPrivacidade.addEventListener('click', async () => {
        await runConfirmedAction(btnPrivacidade, () => updateProfile({ privacyMode: !state.privacyMode }));
    });
}

// Autenticação
let authMode = 'login';

async function actualizarEstadoAuthUI() {
    const user = await getUser();
    const emailDisplay = document.getElementById('user-email-display');
    if (user && emailDisplay) {
        emailDisplay.innerText = user.email;
    }
}

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (isActionBusy()) { showToast('Aguarde a operação em andamento antes de sair.'); return; }
    if (!confirm(t('confirmLogout'))) return;
    initRevision++;
    resetSession();
    hideUserData();
    try {
        await signOutUser();
        showToast(t('authLogoutSuccess'));
    } catch {
        showToast('Não foi possível encerrar a sessão na nuvem. Verifique a conexão e tente novamente.');
    }
    await init();
});

// Alternador de Abas (Entrar / Criar Conta)
const tabAuthLogin = document.getElementById('tab-auth-login');
const tabAuthSignup = document.getElementById('tab-auth-signup');

function setAuthMode(mode) {
    authMode = mode;
    const btnSubmit = document.getElementById('btn-auth-submit');
    if (mode === 'login') {
        tabAuthLogin?.classList.add('active');
        tabAuthSignup?.classList.remove('active');
        if (btnSubmit) btnSubmit.innerText = t('authBtnLogin');
    } else {
        tabAuthSignup?.classList.add('active');
        tabAuthLogin?.classList.remove('active');
        if (btnSubmit) btnSubmit.innerText = t('authBtnSignup');
    }
}

tabAuthLogin?.addEventListener('click', () => setAuthMode('login'));
tabAuthSignup?.addEventListener('click', () => setAuthMode('signup'));

document.getElementById('form-auth')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('input-auth-email').value.trim();
    const password = document.getElementById('input-auth-password').value;
    const btnSubmit = document.getElementById('btn-auth-submit');
    if (!email || !password) return;
    
    btnSubmit.disabled = true;
    btnSubmit.style.opacity = '0.6';
    
    try {
        if (authMode === 'signup') {
            const result = await signUpWithEmail(email, password);
            showToast(result.session ? t('authSuccessSignup') : 'Confira seu e-mail para confirmar o cadastro antes de entrar.');
        } else {
            await signInWithEmail(email, password);
            showToast(t('authSuccessLogin'));
        }
        await init();
    } catch (err) {
        showToast("Erro: " + (err.message || "Falha na autenticação"));
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.style.opacity = '1';
    }
});

function hideUserData() {
    const header = document.querySelector('.header-app');
    if (header) header.style.display = 'none';
    ocultarTodasPantallas();
    document.getElementById('btn-fab-gasto')?.classList.add('oculto');
    document.getElementById('settings-dropdown')?.classList.add('oculto');
    document.getElementById('user-email-display').textContent = '';
    document.getElementById('expense-pending-notice')?.classList.add('oculto');
    setGastoEnEdicion(null);
    viewMonth = hoy.getMonth();
    viewYear = hoy.getFullYear();
    setFiltroHistorial('todos', null);
    resetFiltrosHistorialState();
    // Retirar dados financeiros do DOM ao trocar/encerrar identidade.
    for (const id of ['lista-historial','lista-cuentas','lista-onboarding-cuentas','lista-boletos','lista-onboarding-boletos','lista-vault-historial','nw-chart-container','grafico-categorias','filtros-historial','strip-calendario-dias','categoria-chips','input-cuenta-origen','input-nw-cuenta','input-boleto-categoria','input-onboarding-boleto-categoria']) {
        document.getElementById(id)?.replaceChildren();
    }
    for (const id of ['display-diario','display-mensual','display-gastado','display-limite-hoje','nw-display-total','nw-display-variation','summary-performance','summary-largest','summary-daily']) {
        const element = document.getElementById(id);
        if (element) {
            element.dataset.animationVersion = String(Number(element.dataset.animationVersion || 0) + 1);
            element.textContent = ''; element.dataset.rawVal = '0';
        }
    }
    for (const input of document.querySelectorAll('input')) {
        input.value = input.defaultValue;
        if (input.type === 'checkbox') input.checked = input.defaultChecked;
        if (input.dataset.cents !== undefined) input.dataset.cents = '0';
    }
    resetFormularioGasto(setGastoEnEdicion);
    document.body.classList.remove('privacy-mode');
}
function hasPaymentAccount() { return state.cuentas.some(c => c.tipo === 'cash' || c.tipo === 'credit'); }
function renderPendingExpenseNotice() {
    const notice = document.getElementById('expense-pending-notice');
    if (!notice) return;
    notice.classList.toggle('oculto', !getPendingCreation('expense'));
    notice.querySelector('p').textContent = t('expensePending');
    notice.querySelector('button').textContent = t('expenseResolve');
}
function resolveInitialScreen() {
    renderPendingExpenseNotice();
    inputMoneda.value = state.monedaActual;
    actualizarModoPrivacidade();
    aplicarTraduccion(gastoEnEdicion);
    document.documentElement.lang = currentLang;
    renderizarSelectCategorias(state.categoriasCustom);
    renderCuentasList(state);
    renderBoletosList(state);
    if (state.onboardingCompleted && state.presupuestoMensual > 0 && hasPaymentAccount()) mostrarPantallaPrincipal();
    else {
        ocultarTodasPantallas();
        document.getElementById('pantalla-configuracion').classList.remove('oculto');
        tabDirecto.click();
        inputPresupuesto.value = state.presupuestoMensual > 0 ? String(state.presupuestoMensual / 100) : '';
        goWizardStep(state.presupuestoMensual <= 0 ? 1 : hasPaymentAccount() ? 3 : 2);
    }
}

// Hidratação termina antes de liberar alterações. Nenhum pull tardio pisa em uma edição.
async function init() {
    const revision = ++initRevision;
    resetSession();
    hideUserData();
    setConnectionStatus('Verificando sessão e recuperando dados…');
    let user;
    try { user = await getUser(); }
    catch {
        if (revision !== initRevision) return;
        document.getElementById('pantalla-auth').classList.remove('oculto');
        aplicarTraduccion(null);
        setConnectionStatus('Não foi possível verificar sua sessão. Conecte para entrar.', true);
        return;
    }
    if (revision !== initRevision) return;
    ensureAuthListener();
    if (!user) {
        document.getElementById('pantalla-auth').classList.remove('oculto');
        aplicarTraduccion(null);
        setConnectionStatus('');
        return;
    }
    let hasCache = false;
    recoveryNotice = '';
    try { hasCache = await loadStore(user.id); }
    catch {
        recoveryNotice = 'A cópia local anterior foi preservada, mas não pôde ser carregada. ';
    }
    if (revision !== initRevision || getStoreUserId() !== user.id) return;
    try {
        const pendingErase = getPendingCreation('erase-app');
        if (pendingErase) {
            // Verifica uma exclusão anterior, sem executar uma nova ao abrir.
            const receipt = await getEraseReceiptFromSupabase(String(pendingErase.id), user.id);
            if (revision !== initRevision || getStoreUserId() !== user.id) return;
            if (receipt) {
                resetSession(user.id);
                clearCreationDrafts(user.id);
                try { await clearCurrentUserCache(); } catch { /* A nuvem já confirmou. */ }
                hasCache = false;
            }
        }
        const remote = await pullSupabaseToLocalState(user.id);
        if (revision !== initRevision || getStoreUserId() !== user.id) return;
        if (!remote && hasCache && hasUserData()) throw new Error('O perfil da nuvem não foi encontrado. A cópia local foi preservada.');
        if (remote) applyRemoteSnapshot(remote, user.id);
        try { await saveStore(); }
        catch { recoveryNotice += 'Os dados vieram da nuvem, mas a cópia local não pôde ser gravada. '; }
        if (revision !== initRevision || getStoreUserId() !== user.id) return;
        markStoreReady(user.id);
        document.querySelector('.header-app').style.display = 'grid';
        document.getElementById('user-email-display').textContent = user.email || '';
        resolveInitialScreen();
        setConnectionStatus(recoveryNotice);
    } catch (error) {
        if (revision !== initRevision || getStoreUserId() !== user.id) return;
        document.querySelector('.header-app').style.display = 'grid';
        document.getElementById('user-email-display').textContent = user.email || '';
        resolveInitialScreen();
        setConnectionStatus(recoveryNotice + (hasCache
            ? 'Exibindo somente a cópia local desta conta. Alterações bloqueadas até concluir a atualização. '
            : 'Não foi possível recuperar os dados. Alterações bloqueadas para proteger seu histórico. ') +
            (error.message || ''), true);
    }
}

function mostrarPantallaPrincipal() {
    if (!state.onboardingCompleted || state.presupuestoMensual <= 0 || !hasPaymentAccount()) {
        resolveInitialScreen();
        return;
    }
    renderPendingExpenseNotice();
    transicionPantalla(() => {
        ocultarTodasPantallas();
        document.getElementById('pantalla-principal').classList.remove('oculto');
    });
    
    // Retornar conserva mês, filtros e formulário da mesma sessão.
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
}

document.getElementById('btn-mostrar-mais-historial')?.addEventListener('click', () => {
    toggleMostrarTodosGastos();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('btn-limpar-dia-calendario')?.addEventListener('click', () => {
    limparDiaCalendario();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

const triggerShimmer = () => {
    const cards = document.querySelectorAll('.balance-card, .cat-bar-container');
    cards.forEach(c => c.classList.add('skeleton-loading'));
    setTimeout(() => {
        cards.forEach(c => c.classList.remove('skeleton-loading'));
    }, 200);
};

document.getElementById('btn-prev-month').addEventListener('click', () => {
    triggerShimmer();
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    setFiltroHistorial('todos', null);
    resetFiltrosHistorialState();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('btn-next-month').addEventListener('click', () => {
    triggerShimmer();
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    setFiltroHistorial('todos', null);
    resetFiltrosHistorialState();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('lang-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('flag')) {
        setLangStr(e.target.getAttribute('data-lang'));
        document.querySelectorAll('.flag').forEach(f => f.classList.remove('active'));
        e.target.classList.add('active');
        
        aplicarTraduccion(gastoEnEdicion);
        renderPendingExpenseNotice();
        renderizarSelectCategorias(state.categoriasCustom);
        
        renderCuentasList(state);
        renderBoletosList(state);
        recalcularPresupuestoOnboarding();
        
        if(!document.getElementById('pantalla-principal').classList.contains('oculto')) {
            actualizarInterfaz(state, viewMonth, viewYear, hoy);
        }
    }
});

const tabDirecto = document.getElementById('tab-directo');
const tabCalc = document.getElementById('tab-calc');
const modoDirecto = document.getElementById('modo-directo');
const modoCalculadora = document.getElementById('modo-calculadora');

tabDirecto.addEventListener('click', () => {
    modoActual = 'directo';
    tabDirecto.classList.add('active');
    tabCalc.classList.remove('active');
    modoDirecto.classList.remove('oculto');
    modoCalculadora.classList.add('oculto');
});

tabCalc.addEventListener('click', () => {
    modoActual = 'calculadora';
    tabCalc.classList.add('active');
    tabDirecto.classList.remove('active');
    modoCalculadora.classList.remove('oculto');
    modoDirecto.classList.add('oculto');
    recalcularPresupuestoOnboarding();
    renderBoletosList(state);
});

function recalcularPresupuestoOnboarding() {
    if (modoActual !== 'calculadora') return;
    
    const rentaCents = Math.round((parseFloat(inputIngresos?.value) || 0) * 100);
    const pctViver = parseFloat(inputPctViver?.value) || 0;
    const pctLivre = parseFloat(inputPctLivre?.value) || 0;
    
    const tetoSobrevivenciaCents = Math.round(rentaCents * (pctViver / 100));
    const tetoLivreCents = Math.round(rentaCents * (pctLivre / 100));
    
    const totalBoletosCents = state.boletos.reduce((acc, b) => acc + b.monto, 0);
    const supervivenciaLiquidaCents = Math.max(0, tetoSobrevivenciaCents - totalBoletosCents);
    
    presupuestoCalculadoTemporalCents = supervivenciaLiquidaCents + tetoLivreCents;
    
    displayNetSurvival.innerText = formatCurrency(supervivenciaLiquidaCents, inputMoneda.value);
    displayFreeSpending.innerText = formatCurrency(tetoLivreCents, inputMoneda.value);
    displayCalculado.innerText = formatCurrency(presupuestoCalculadoTemporalCents, inputMoneda.value);
}

document.querySelectorAll('.input-calc').forEach(input => {
    input.addEventListener('input', recalcularPresupuestoOnboarding);
});

inputMoneda.addEventListener('change', async () => {
    const desired = inputMoneda.value;
    if (!await runConfirmedAction(inputMoneda, () => updateProfile({ monedaActual: desired }))) { inputMoneda.value = state.monedaActual; return; }
    recalcularPresupuestoOnboarding();
    renderBoletosList(state);
    renderCuentasList(state);
});

function goWizardStep(step) {
    transicionPantalla(() => {
        document.getElementById('wizard-step-1').classList.add('oculto');
        document.getElementById('wizard-step-2').classList.add('oculto');
        document.getElementById('wizard-step-3').classList.add('oculto');
        
        document.getElementById(`wizard-step-${step}`).classList.remove('oculto');
        
        [1,2,3].forEach(i => {
            const ind = document.getElementById(`wizard-ind-${i}`);
            if (i <= step) {
                ind.classList.add('active');
            } else {
                ind.classList.remove('active');
            }
        });
    });
}

document.getElementById('btn-wizard-next-1').addEventListener('click', async (e) => {
    const inputVal = parseFloat(inputPresupuesto.value);
    const nuevoPresupuesto = modoActual === 'directo' ? Math.round((isNaN(inputVal) ? 0 : inputVal) * 100) : presupuestoCalculadoTemporalCents;
    
    if (!Number.isSafeInteger(nuevoPresupuesto) || nuevoPresupuesto <= 0) {
        alert(t('errorBudget'));
        return;
    }
    if (!await runConfirmedAction(e.currentTarget, () => updateProfile({ presupuestoMensual: nuevoPresupuesto }))) return;
    renderCuentasList(state);
    goWizardStep(2);
});

document.getElementById('btn-wizard-back-1').addEventListener('click', () => goWizardStep(1));
document.getElementById('btn-wizard-next-2').addEventListener('click', () => {
    if (!state.cuentas.some(c => c.tipo === 'cash' || c.tipo === 'credit')) { showToast('Cadastre uma conta ou cartão antes de continuar.'); return; }
    goWizardStep(3);
});
document.getElementById('btn-wizard-back-2').addEventListener('click', () => goWizardStep(2));

document.getElementById('form-onboarding-boleto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = document.getElementById('input-onboarding-boleto-desc').value.trim();
    const montoInput = document.getElementById('input-onboarding-boleto-monto');
    const montoCents = parseInt(montoInput.dataset.cents || '0', 10);
    const dia = parseInt(document.getElementById('input-onboarding-boleto-dia').value, 10);
    const categoria = document.getElementById('input-onboarding-boleto-categoria').value;
    
    if (desc && montoCents > 0 && dia >= 1 && dia <= 31) {
        const draft = getCreationDraft('bill-onboarding', 'bol_');
        const id = draft.id;
        const novoBoleto = { id, desc, monto: montoCents, diaVencimiento: dia, categoria };
        if (!await runConfirmedAction(e.currentTarget, () => addBoleto(novoBoleto))) return;
        completeCreation(draft);
        
        document.getElementById('input-onboarding-boleto-desc').value = '';
        montoInput.value = '';
        montoInput.dataset.cents = '0';
        document.getElementById('input-onboarding-boleto-dia').value = '';
        
        showToast(" " + t('btnSave'));
        renderBoletosList(state);
        recalcularPresupuestoOnboarding();
    }
});

document.getElementById('input-onboarding-cuenta-tipo').addEventListener('change', (e) => {
    const groupCierre = document.getElementById('group-onboarding-cuenta-cierre');
    if (e.target.value === 'credit') {
        groupCierre.classList.remove('oculto');
    } else {
        groupCierre.classList.add('oculto');
        document.getElementById('input-onboarding-cuenta-cierre').value = '';
    }
});

document.getElementById('form-onboarding-cuenta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('input-onboarding-cuenta-nombre').value.trim();
    const tipo = document.getElementById('input-onboarding-cuenta-tipo').value;
    const cierreInput = document.getElementById('input-onboarding-cuenta-cierre').value;
    
    if (nombre) {
        const draft = getCreationDraft('account-onboarding', 'acc_');
        const id = draft.id;
        const novaCuenta = { 
            id, 
            nombre, 
            tipo, 
            cierreTC: tipo === 'credit' && cierreInput ? parseInt(cierreInput, 10) : null 
        };
        if (!await runConfirmedAction(e.currentTarget, () => addCuenta(novaCuenta))) return;
        completeCreation(draft);
        
        document.getElementById('input-onboarding-cuenta-nombre').value = '';
        document.getElementById('input-onboarding-cuenta-cierre').value = '';
        showToast(" " + t('btnSave'));
        renderCuentasList(state);
    }
});

document.getElementById('btn-comenzar').addEventListener('click', async (e) => {
    if (!isStoreReady()) { showToast('Atualize os dados antes de continuar.'); return; }
    if (state.presupuestoMensual <= 0 || !hasPaymentAccount()) {
        showToast(t('setupRequired')); resolveInitialScreen(); return;
    }
    if (!document.getElementById('area-gastos-previos').classList.contains('oculto')) {
        const inicialCents = Math.round((parseFloat(document.getElementById('input-gastos-iniciales').value) || 0) * 100);
        if (inicialCents > 0) {
            const defaultCuenta = state.cuentas.find(c => c.tipo === 'cash' || c.tipo === 'credit')?.id || null;
            const draft = getCreationDraft('initial-expense');
            if (!await runConfirmedAction(e.currentTarget, () => confirmCreatedExpense({
                id: draft.id,
                monto: inicialCents,
                desc: t('prevExpense'),
                fecha: draft.createdAt,
                categoria: 'otros_previo',
                cuentaId: defaultCuenta
            }))) return;
            completeCreation(draft);
            document.getElementById('input-gastos-iniciales').value = '';
        }
    }
    
    if (!await runConfirmedAction(e.currentTarget, () => updateProfile({ onboardingCompleted: true }))) return;
    localStorage.setItem(STORAGE_KEYS.MES_GUARDADO, hoy.getMonth());
    mostrarPantallaPrincipal();
});

function formatInputCents(e) {
    let digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
        e.target.value = '';
        e.target.dataset.cents = '0';
        return;
    }
    const cents = parseInt(digits, 10);
    e.target.dataset.cents = cents;
    e.target.value = formatCurrency(cents, state.monedaActual);
}

document.getElementById('input-monto').addEventListener('input', formatInputCents);
document.getElementById('input-boleto-monto').addEventListener('input', formatInputCents);
document.getElementById('input-onboarding-boleto-monto').addEventListener('input', formatInputCents);

const inputNwMonto = document.getElementById('input-nw-monto');
if (inputNwMonto) inputNwMonto.addEventListener('input', formatInputCents);

let autoCatDebounceTimer;
document.getElementById('input-desc').addEventListener('input', (e) => {
    clearTimeout(autoCatDebounceTimer);
    autoCatDebounceTimer = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 2) {
            // ML Leve: Encontra a última despesa que CONTENHA o texto digitado
            const match = state.historialGlobal.slice().reverse().find(g => g.desc.toLowerCase().includes(query));
            if (match) {
                const inputHidden = document.getElementById('input-categoria');
                const chipTarget = document.querySelector(`.cat-chip[data-id="${match.categoria}"]`);
                if (chipTarget && inputHidden && inputHidden.value !== match.categoria) {
                    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
                    chipTarget.classList.add('active');
                    inputHidden.value = match.categoria;
                    chipTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        }
    }, INTERACTION_CONFIG.DEBOUNCE_DELAY_MS);
});

const btnToggleNuevaCat = document.getElementById('btn-toggle-nueva-cat');
const areaNuevaCat = document.getElementById('area-nueva-categoria');
const btnGuardarNuevaCat = document.getElementById('btn-guardar-nueva-cat');

if (btnToggleNuevaCat && areaNuevaCat) {
    btnToggleNuevaCat.addEventListener('click', () => {
        areaNuevaCat.classList.toggle('oculto');
    });
}

if (btnGuardarNuevaCat) {
    btnGuardarNuevaCat.addEventListener('click', async () => {
        const nombreInput = document.getElementById('input-nueva-cat-nombre');
        const emojiInput = document.getElementById('input-nueva-cat-emoji');
        const nombre = nombreInput.value.trim();
        const emoji = emojiInput.value.trim() || '🏷️';
        if (nombre) {
            const newCat = { id: 'custom_' + nextRecordId(), emoji, nombre };
            if (!await runConfirmedAction(btnGuardarNuevaCat, () => updateProfile({ categoriasCustom: [...state.categoriasCustom, newCat] }))) return;
            nombreInput.value = '';
            emojiInput.value = '';
            areaNuevaCat.classList.add('oculto');
            renderizarSelectCategorias(state.categoriasCustom);
            showToast(" " + t('btnSave'));
        }
    });
}

function atualizarCheckboxMes() {
    const cuentaId = document.getElementById('input-cuenta-origen')?.value;
    const inputFecha = document.getElementById('input-fecha-gasto')?.value;
    const checkbox = document.getElementById('checkbox-mes-siguiente');
    if (!cuentaId || !checkbox) return;
    if (gastoEnEdicion !== null) {
        checkbox.checked = false;
        return;
    }
    const cuenta = state.cuentas.find(c => c.id === cuentaId);
    const dataBase = inputFecha ? new Date(inputFecha + 'T12:00:00') : new Date();
    
    if (cuenta && cuenta.tipo === 'credit' && cuenta.cierreTC) {
        const ultimoDiaMesActual = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0).getDate();
        const diaCierreEfectivo = Math.min(cuenta.cierreTC, ultimoDiaMesActual);
        
        checkbox.checked = dataBase.getDate() > diaCierreEfectivo;
    } else {
        checkbox.checked = false;
    }
}

document.getElementById('input-cuenta-origen').addEventListener('change', atualizarCheckboxMes);
document.getElementById('input-fecha-gasto').addEventListener('change', atualizarCheckboxMes);

const btnGuardarGasto = document.getElementById('btn-guardar-gasto');
if (btnGuardarGasto && !document.getElementById('btn-cancelar-edicion')) {
    const btnCancelar = document.createElement('button');
    btnCancelar.id = 'btn-cancelar-edicion';
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn-base btn-secundario mb-10 oculto';
    btnCancelar.innerText = getHistoryText('cancelEdit');
    btnCancelar.addEventListener('click', () => {
        resetFormularioGasto(setGastoEnEdicion);
        actualizarInterfaz(state, viewMonth, viewYear, hoy);
    });
    btnGuardarGasto.insertAdjacentElement('afterend', btnCancelar);
}

document.getElementById('btn-resolve-expense').addEventListener('click', async (e) => {
    if (isActionBusy()) return;
    const draft = getPendingCreation('expense');
    if (!draft) { renderPendingExpenseNotice(); return; }
    const ownerId = getStoreUserId();
    let receipt;
    if (!await runConfirmedAction(e.currentTarget, async () => {
        receipt = await getExpenseReceiptFromSupabase(draft.operationId, ownerId, true);
        if (getStoreUserId() !== ownerId) throw new Error('A sessão mudou.');
        completeCreation(draft);
    })) return;
    resetFormularioGasto(setGastoEnEdicion);
    await init();
    showToast(t(receipt?.status === 'cancelled' ? 'expenseNotSaved' : 'expenseConfirmed'));
});
document.getElementById('form-gasto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputMonto = document.getElementById('input-monto');
    let montoCents = parseInt(inputMonto.dataset.cents || '0', 10);
    const desc = document.getElementById('input-desc').value.trim();
    const cat = document.getElementById('input-categoria').value;
    
    if (montoCents === 0 && inputMonto.value) {
        const digits = inputMonto.value.replace(/\D/g, '');
        if (digits) montoCents = parseInt(digits, 10);
    }
    const cuentaId = document.getElementById('input-cuenta-origen').value;
    if (!cuentaId) {
        showToast(t('errSelectSourceAccount'));
        return;
    }
    
    const inputCuotas = document.getElementById('input-cuotas');
    const cuotas = Number(inputCuotas?.value || 1);
    
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 360 || cuotas > montoCents) {
        showToast(t('errInvalid') || "Erro: Parcelas inválidas.");
        return;
    }
    const inputFecha = document.getElementById('input-fecha-gasto').value;
    const dataBase = inputFecha ? new Date(inputFecha + 'T12:00:00') : new Date();
    
    if (!Number.isFinite(dataBase.getTime())) { showToast('Data inválida.'); return; }
    const checkboxMarcado = document.getElementById('checkbox-mes-siguiente').checked;
    const startOffset = checkboxMarcado ? 1 : 0;
    
    if (!Number.isSafeInteger(montoCents) || montoCents <= 0) { showToast(t('errInvalid')); return; }
    if (desc) {
        const wasEditing = gastoEnEdicion;
        const baseIso = dataBase.toISOString();
        
        if (wasEditing) {
            // Alterar descrição/valor não modifica a data nem a competência original.
            const fechaSinCambio = gastoOriginalEnEdicion &&
                inputFecha === fechaLocalInput(gastoOriginalEnEdicion.fecha);
            let mesEfectivo = fechaSinCambio ? gastoOriginalEnEdicion.mesEfectivo : undefined;
            let fechaIso = fechaSinCambio ? gastoOriginalEnEdicion.fecha : baseIso;
            if (startOffset > 0) {
                const futureDate = new Date(dataBase.getFullYear(), dataBase.getMonth() + startOffset, 1, 12, 0, 0);
                mesEfectivo = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
                fechaIso = futureDate.toISOString();
            }
            if (!await runConfirmedAction(e.currentTarget, () => updateExpense(gastoEnEdicion, { monto: montoCents, desc, categoria: cat, mesEfectivo, cuentaId, fecha: fechaIso }))) return;
            resetFormularioGasto(setGastoEnEdicion);
        } else {
            const montoCuotaNormal = Math.floor(montoCents / cuotas);
            const montoUltimaCuota = montoCents - (montoCuotaNormal * (cuotas - 1));
            
            const nuevasCuotas = [];
            let draft;
            try {
                draft = await getExpenseCreationDraft({ montoCents, desc, cat, cuentaId, cuotas, inputFecha, startOffset }, baseIso);
            } catch (error) { showToast(error.code === 'PENDING_EXPENSE' ? t('expensePending') : error.message); renderPendingExpenseNotice(); return; }
            renderPendingExpenseNotice();
            const groupId = draft.groupId;
            const expenseDate = new Date(draft.baseIso);
            for (let i = 0; i < cuotas; i++) {
                const totalMonthOffset = startOffset + i;
                let mesEfectivo = undefined;
                let fechaIso = draft.baseIso;
                
                if (totalMonthOffset > 0) {
                    const futureDate = new Date(expenseDate.getFullYear(), expenseDate.getMonth() + totalMonthOffset, 1, 12, 0, 0);
                    mesEfectivo = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
                    fechaIso = futureDate.toISOString();
                }
                
                const descCuota = cuotas > 1 ? `${desc} (${i + 1}/${cuotas})` : desc;
                const montoMapeado = (i === cuotas - 1) ? montoUltimaCuota : montoCuotaNormal;
                
                nuevasCuotas.push({
                    id: draft.itemIds[i],
                    groupId: groupId,
                    monto: montoMapeado,
                    desc: descCuota,
                    fecha: fechaIso,
                    categoria: cat,
                    mesEfectivo,
                    cuentaId
                });
            }
            if (!await runConfirmedAction(e.currentTarget, () => createExpensesOnce(draft, nuevasCuotas))) return;
            completeCreation(draft);
            renderPendingExpenseNotice();
            resetFormularioGasto(setGastoEnEdicion);
        }
        
        actualizarInterfaz(state, viewMonth, viewYear, hoy);
        if (document.activeElement) document.activeElement.blur();
        if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.SHORT_MS);
        showToast(wasEditing ? " " + t('btnEdit') : " " + t('btnAdd'));
    }
});

document.getElementById('btn-menu-cuentas').addEventListener('click', () => {
    if (settingsDropdown) settingsDropdown.classList.add('oculto');
    history.pushState({ view: 'cuentas' }, '');
    
    transicionPantalla(() => {
        ocultarTodasPantallas();
        document.getElementById('pantalla-cuentas').classList.remove('oculto');
    });
    renderCuentasList(state);
});

document.getElementById('btn-cerrar-cuentas')?.addEventListener('click', mostrarPantallaPrincipal);

const inputCuentaTipo = document.getElementById('input-cuenta-tipo');
if (inputCuentaTipo) {
    inputCuentaTipo.addEventListener('change', (e) => {
        const groupCierre = document.getElementById('group-cuenta-cierre');
        if (e.target.value === 'credit') {
            groupCierre.classList.remove('oculto');
        } else {
            groupCierre.classList.add('oculto');
            document.getElementById('input-cuenta-cierre').value = '';
        }
    });
}

const formCuenta = document.getElementById('form-cuenta');
if (formCuenta) {
    formCuenta.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('input-cuenta-nombre').value.trim();
        const tipo = document.getElementById('input-cuenta-tipo').value;
        const cierreInput = document.getElementById('input-cuenta-cierre').value;
        
        if (nombre) {
            const draft = getCreationDraft('account', 'acc_');
            const id = draft.id;
            const novaCuenta = { 
                id, 
                nombre, 
                tipo, 
                cierreTC: tipo === 'credit' && cierreInput ? parseInt(cierreInput, 10) : null 
            };
            if (!await runConfirmedAction(e.currentTarget, () => addCuenta(novaCuenta))) return;
            completeCreation(draft);
            
            document.getElementById('input-cuenta-nombre').value = '';
            document.getElementById('input-cuenta-cierre').value = '';
            showToast(" " + t('btnSave'));
            renderCuentasList(state);
        }
    });
}

document.getElementById('btn-menu-boletos').addEventListener('click', () => {
    if (settingsDropdown) settingsDropdown.classList.add('oculto');
    history.pushState({ view: 'boletos' }, '');
    
    transicionPantalla(() => {
        ocultarTodasPantallas();
        document.getElementById('pantalla-boletos').classList.remove('oculto');
    });
    renderBoletosList(state);
});

document.getElementById('btn-cerrar-boletos')?.addEventListener('click', mostrarPantallaPrincipal);

document.getElementById('form-boleto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = document.getElementById('input-boleto-desc').value.trim();
    const montoInput = document.getElementById('input-boleto-monto');
    const montoCents = parseInt(montoInput.dataset.cents || '0', 10);
    const dia = parseInt(document.getElementById('input-boleto-dia').value, 10);
    const categoria = document.getElementById('input-boleto-categoria').value;
    
    if (desc && montoCents > 0 && dia >= 1 && dia <= 31) {
        const draft = getCreationDraft('bill', 'bol_');
        const id = draft.id;
        const novoBoleto = { id, desc, monto: montoCents, diaVencimiento: dia, categoria };
        if (!await runConfirmedAction(e.currentTarget, () => addBoleto(novoBoleto))) return;
        completeCreation(draft);
        
        document.getElementById('input-boleto-desc').value = '';
        montoInput.value = '';
        montoInput.dataset.cents = '0';
        document.getElementById('input-boleto-dia').value = '';
        showToast(" " + t('btnSave'));
        renderBoletosList(state);
    }
});

document.getElementById('btn-editar-presupuesto').addEventListener('click', () => {
    history.pushState({ view: 'configuracion' }, '');
    
    transicionPantalla(() => {
        ocultarTodasPantallas();
        document.getElementById('pantalla-configuracion').classList.remove('oculto');
        document.getElementById('wizard-step-1').classList.remove('oculto');
        document.getElementById('wizard-step-2').classList.add('oculto');
        document.getElementById('wizard-step-3').classList.add('oculto');
        tabDirecto.click();
        document.getElementById('wizard-ind-1').classList.add('active');
        document.getElementById('wizard-ind-2').classList.remove('active');
        document.getElementById('wizard-ind-3').classList.remove('active');
    });
    
    inputPresupuesto.value = (state.presupuestoMensual / 100).toString();
    inputMoneda.value = state.monedaActual;
});

const eraseButton = document.getElementById('btn-reiniciar');
eraseButton.setAttribute('aria-label', 'Apagar meus dados do Floux');
eraseButton.addEventListener('click', async (e) => {
    if (isActionBusy()) { showToast(t('actionWait')); return; }
    if (!isStoreReady()) { showToast('Atualize os dados antes de apagar.'); return; }
    const userId = getStoreUserId();
    const email = document.getElementById('user-email-display').textContent;
    const answer = prompt(`Apagar os dados do Floux de ${email || 'sua conta'}?\n\nSerão apagados gastos, contas, boletos, patrimônio, orçamento e preferências da nuvem. Seu login continuará existindo. Não há desfazer.\n\nFeche o Floux em outros dispositivos antes de continuar.\n\nDigite APAGAR para confirmar:`);
    if (answer !== 'APAGAR') return;
    const draft = getCreationDraft('erase-app', 'reset_');
    if (!await runConfirmedAction(e.currentTarget, () => eraseUserData(String(draft.id)), { label: t('actionDeleting') })) {
        // Se a resposta se perdeu, o recibo permite confirmar sem repetir DELETE.
        await init();
        return;
    }
    clearCreationDrafts(userId);
    try { await clearCurrentUserCache(); } catch { /* O snapshot já está vazio e a nuvem confirmou. */ }
    try {
        const channel = new BroadcastChannel('floux-reset-v1');
        channel.postMessage({ userId });
        channel.close();
    } catch { /* Reabra outras abas se este recurso não existir. */ }
    await init();
    showToast('Seus dados do Floux foram apagados. Seu login foi mantido.');
});
try {
    const resetChannel = new BroadcastChannel('floux-reset-v1');
    resetChannel.addEventListener('message', async ({ data }) => {
        if (data?.userId !== getStoreUserId()) return;
        initRevision++;
        resetSession(data.userId);
        hideUserData();
        clearCreationDrafts(data.userId);
        try { await clearCurrentUserCache(); } catch { /* A leitura da nuvem decidirá o estado. */ }
        await init();
    });
} catch { /* Navegadores sem BroadcastChannel não sincronizam o reset entre abas. */ }

const fabGasto = document.getElementById('btn-fab-gasto');
if (fabGasto) {
    fabGasto.addEventListener('click', () => {
        const areaRegistro = document.getElementById('area-registrar-gasto');
        if (areaRegistro) {
            areaRegistro.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => document.getElementById('input-monto').focus(), INTERACTION_CONFIG.KEYBOARD_FOCUS_DELAY_MS);
        }
    });
}

// ==========================================
// CARREGAMENTO SOB DEMANDA (CODE SPLITTING)
// ==========================================
let visionModule = null;
let vaultModule = null;

document.getElementById('btn-abrir-simulador')?.addEventListener('click', async () => {
    if (!visionModule) {
        visionModule = await import('./flouxVision.js');
        visionModule.initFlouxVision(mostrarPantallaPrincipal);
    }
    history.pushState({ view: 'simulador' }, '');
    transicionPantalla(() => {
        ocultarTodasPantallas();
        document.getElementById('pantalla-simulador').classList.remove('oculto');
    });
    visionModule.actualizarPerdidaInvisibleUI();
});

document.getElementById('btn-abrir-flouxvault')?.addEventListener('click', async () => {
    if (!vaultModule) {
        vaultModule = await import('./flouxVault.js');
        vaultModule.initFlouxVault(mostrarPantallaPrincipal);
    }
    history.pushState({ view: 'flouxvault' }, '');
    transicionPantalla(() => {
        ocultarTodasPantallas();
        document.getElementById('pantalla-flouxvault').classList.remove('oculto');
    });
    vaultModule.renderNetWorthSection(state);
});

initSwipeActions(document.getElementById('lista-historial'), INTERACTION_CONFIG.SWIPE, {
    onDelete: async (id) => {
        const gasto = state.historialGlobal.find(g => String(g.id) === String(id));
        if (!gasto) return;
        const isInstallment = /\(\d+\/\d+\)$/.test((gasto.desc || '').trim());
        
        if (isInstallment) {
            let relatedExpenses = [];
            if (gasto.groupId) {
                relatedExpenses = state.historialGlobal.filter(g => g.groupId === gasto.groupId);
            } else {
                const baseDesc = gasto.desc.replace(/\s*\(\d+\/\d+\)$/, '').trim();
                relatedExpenses = state.historialGlobal.filter(g => 
                    g.desc.startsWith(baseDesc) && 
                    g.cuentaId === gasto.cuentaId &&
                    Math.abs(g.monto - gasto.monto) <= 100
                );
            }
            if (relatedExpenses.length > 1) {
                const deleteAll = confirm(t('confirmDeleteAllInst'));
                if (deleteAll) {
                    const idsToRemove = relatedExpenses.map(r => r.id);
                    if (!await runConfirmedAction(document.getElementById('lista-historial'), () => removeMultipleExpenses(idsToRemove))) return;
                    
                    if (gastoEnEdicion && idsToRemove.includes(gastoEnEdicion)) resetFormularioGasto(setGastoEnEdicion);
                    if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.DELETE_PATTERN_MS);
                    showToast(" " + t('toastAllDeleted'));
                    return;
                }
            }
        }
        
        if (!await runConfirmedAction(document.getElementById('lista-historial'), () => removeExpense(id))) return;
        if (gastoEnEdicion !== null && String(gastoEnEdicion) === String(id)) resetFormularioGasto(setGastoEnEdicion);
        if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.DELETE_PATTERN_MS);
        showToast(" " + t('toastDeleted'));
    },
    onEdit: (id) => {
        if (isActionBusy()) { showToast(t('actionWait')); return; }
        const gasto = state.historialGlobal.find(g => String(g.id) === String(id));
        if (gasto) {
            setGastoEnEdicion(gasto.id);
            actualizarInterfaz(state, viewMonth, viewYear, hoy);
            document.getElementById('checkbox-mes-siguiente').checked = false;
            const inputMonto = document.getElementById('input-monto');
            inputMonto.dataset.cents = gasto.monto;
            inputMonto.value = formatCurrency(gasto.monto, state.monedaActual);
            
            document.getElementById('input-desc').value = gasto.desc;
            
            const inputFecha = document.getElementById('input-fecha-gasto');
            if (inputFecha && gasto.fecha) {
                const dataGasto = new Date(gasto.fecha);
                const ano = dataGasto.getFullYear();
                const mes = String(dataGasto.getMonth() + 1).padStart(2, '0');
                const dia = String(dataGasto.getDate()).padStart(2, '0');
                inputFecha.value = `${ano}-${mes}-${dia}`;
            }
            const inputHidden = document.getElementById('input-categoria');
            inputHidden.value = gasto.categoria;
            document.querySelectorAll('.cat-chip').forEach(c => {
                const isActive = c.dataset.id === gasto.categoria;
                c.classList.toggle('active', isActive);
                if (isActive) c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
            
            if (gasto.cuentaId) {
                document.getElementById('input-cuenta-origen').value = gasto.cuentaId;
            }
            const containerCuotas = document.getElementById('container-cuotas');
            if (containerCuotas) containerCuotas.style.display = 'none';
            
            const isInstallment = /\(\d+\/\d+\)$/.test((gasto.desc || '').trim());
            let warnEl = document.getElementById('edit-installment-warning');
            
            if (!warnEl) {
                warnEl = document.createElement('div');
                warnEl.id = 'edit-installment-warning';
                warnEl.style.color = 'var(--danger-color)';
                warnEl.style.fontSize = '0.85rem';
                warnEl.style.marginBottom = '15px';
                warnEl.style.marginTop = '-5px';
                warnEl.style.padding = '10px';
                warnEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                warnEl.style.borderRadius = '8px';
                if (containerCuotas) {
                    containerCuotas.parentNode.insertBefore(warnEl, containerCuotas.nextSibling);
                }
            }
            if (isInstallment) {
                warnEl.innerText = " " + t('warnEditInstallmentMsg');
                warnEl.style.display = 'block';
                showToast(" " + t('warnEditInstallment'));
            } else {
                warnEl.style.display = 'none';
            }
            
            document.getElementById('btn-guardar-gasto').innerText = t('btnEdit');
            document.getElementById('input-monto').focus();
            document.getElementById('area-registrar-gasto').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});

let authUnsubscribe = null;
function ensureAuthListener() {
    if (authUnsubscribe) return;
    try {
        authUnsubscribe = onAuthChange((event, session) => {
            if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
            if ((session?.user?.id || null) !== getStoreUserId()) {
                initRevision++;
                resetSession();
                hideUserData();
                setTimeout(() => init(), 0);
            }
        });
    } catch { /* Nova tentativa em init quando o SDK da CDN estiver disponível. */ }
}
ensureAuthListener();
init();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    });

    // Escuta quando um novo Service Worker assume o controle (devido ao skipWaiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

window.addEventListener('popstate', () => {
    mostrarPantallaPrincipal();
});