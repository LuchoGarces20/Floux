import { state, loadStore, saveStore, isValidBackupSchema, STORAGE_KEYS, addExpense, addMultipleExpenses, updateExpense, removeExpense, replaceHistory, subscribe } from './store.js';
import { currentLang, t, setLangStr, formatCurrency } from './i18n.js';
import { aplicarTraduccion, renderizarSelectCategorias, renderCuentasList, renderBoletosList, actualizarInterfaz, resetFormularioGasto, showToast, setFiltroHistorial, resetFiltrosHistorialState, toggleMostrarTodosGastos, limparDiaCalendario } from './ui.js';
import { initFlouxVision } from './flouxVision.js';
import { initFlouxVault } from './flouxVault.js';
import { initSwipeActions } from './swipeHandler.js';

const INTERACTION_CONFIG = {
    KEYBOARD_FOCUS_DELAY_MS: 300,
    DEBOUNCE_DELAY_MS: 300,
    MAX_IMPORT_FILE_SIZE_BYTES: 5 * 1024 * 1024,
    SWIPE: { MAX_PX: -110, THRESHOLD_PX: -40, MIN_DRAG_PX: 5 },
    HAPTICS: { SHORT_MS: 15, DELETE_PATTERN_MS: [30, 50, 30] }
};

let gastoEnEdicion = null;
const setGastoEnEdicion = (val) => { gastoEnEdicion = val; };

const hoy = new Date();
const mesActual = hoy.getMonth();
const anoActual = hoy.getFullYear();

let viewMonth = mesActual;
let viewYear = anoActual;
let modoActual = 'directo';
let presupuestoCalculadoTemporalCents = 0;

let saveTimeout;
let isSaving = false;
let needsAnotherSave = false;

const executeSave = async () => {
    if (isSaving) {
        needsAnotherSave = true;
        return;
    }
    isSaving = true;
    try {
        await saveStore();
        if (!document.getElementById('pantalla-principal').classList.contains('oculto')) {
            actualizarInterfaz(state, viewMonth, viewYear, hoy);
        }
    } catch (error) {
        if (error && error.name === 'QuotaExceededError') {
            showToast("⚠️ Erro: Armazenamento cheio. Libere espaço para salvar.");
        }
    } finally {
        isSaving = false;
        if (needsAnotherSave) {
            needsAnotherSave = false;
            executeSave();
        }
    }
};

// FILTRAGEM DO PROXY REATIVO (Evita re-renders pesados para alterações visuais)
subscribe((property) => {
    if (property === 'privacyMode') {
        actualizarModoPrivacidade();
        return;
    }
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(executeSave, 50);
});

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && (saveTimeout || isSaving)) {
        clearTimeout(saveTimeout);
        executeSave();
    }
});

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

// LEMBRETE DIÁRIO / NOTIFICAÇÕES PUSH
const btnLembrete = document.getElementById('btn-lembrete');
if (btnLembrete) {
    btnLembrete.addEventListener('click', async () => {
        if (settingsDropdown) settingsDropdown.classList.add('oculto');
        
        if (!('Notification' in window)) {
            showToast("⚠️ " + t('notifUnsupported'));
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast("🔔 " + t('notifActivated'));
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification("Floux", {
                    body: t('notifBody'),
                    icon: './img/logo180.png',
                    badge: './img/logo-floux.svg'
                });
            }
        } else {
            showToast("⚠️ " + t('notifDenied'));
        }
    });
}

document.addEventListener('click', (e) => {
    if (settingsDropdown && !settingsDropdown.classList.contains('oculto')) {
        const isClickInsideMenu = settingsDropdown.contains(e.target);
        const isClickOnToggle = btnSettingsToggle && btnSettingsToggle.contains(e.target);
        if (!isClickInsideMenu && !isClickOnToggle) {
            settingsDropdown.classList.add('oculto');
        }
    }
    
    const btnEliminarBoleto = e.target.closest('.btn-eliminar-boleto');
    if (btnEliminarBoleto) {
        state.boletos = state.boletos.filter(b => b.id !== btnEliminarBoleto.dataset.id);
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
                showToast("Erro: Nenhuma conta disponível para pagar.");
                return;
            }
            if (confirm(`Pagar "${boleto.desc}" no valor de ${formatCurrency(boleto.monto, state.monedaActual)}?`)) {
                addExpense({
                    id: Date.now(),
                    monto: boleto.monto,
                    desc: boleto.desc,
                    fecha: new Date().toISOString(),
                    categoria: boleto.categoria,
                    cuentaId: cuentaId,
                    boletoId: boleto.id
                });
                if (navigator.vibrate) navigator.vibrate(15);
                showToast("💳 Boleto pago e contabilizado!");
                renderBoletosList(state);
                if (!document.getElementById('pantalla-principal').classList.contains('oculto')) {
                    actualizarInterfaz(state, viewMonth, viewYear, hoy);
                }
            }
        }
    }

    const btnCuentaDelete = e.target.closest('.btn-eliminar-cuenta');
    if (btnCuentaDelete) {
        state.cuentas = state.cuentas.filter(c => c.id !== btnCuentaDelete.dataset.id);
        renderCuentasList(state);
    }
});

function actualizarModoPrivacidade() {
    if (!btnPrivacidade) return;
    if (state.privacyMode) {
        document.body.classList.add('privacy-mode');
        btnPrivacidade.innerText = '👁️‍🗨️';
    } else {
        document.body.classList.remove('privacy-mode');
        btnPrivacidade.innerText = '👁️';
    }
}

if (btnPrivacidade) {
    btnPrivacidade.addEventListener('click', () => {
        state.privacyMode = !state.privacyMode;
    });
}

async function init() {
    const hasData = await loadStore();
    inputMoneda.value = state.monedaActual;
    
    const inputCierre = document.getElementById('input-cierre-tc');
    if (inputCierre) inputCierre.value = state.cierreTC || 24;
    
    actualizarModoPrivacidade();
    
    const activeFlag = document.querySelector(`.flag[data-lang="${currentLang}"]`);
    if (activeFlag) activeFlag.classList.add('active');
    
    aplicarTraduccion(gastoEnEdicion);
    renderizarSelectCategorias(state.categoriasCustom);
    
    if (hasData) {
        if (localStorage.getItem(STORAGE_KEYS.MES_GUARDADO) === null || parseInt(localStorage.getItem(STORAGE_KEYS.MES_GUARDADO), 10) !== mesActual) {
            localStorage.setItem(STORAGE_KEYS.MES_GUARDADO, mesActual);
        }
        mostrarPantallaPrincipal();
        resetFormularioGasto(setGastoEnEdicion);
        
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action) {
            if (action === 'add-expense') {
                const inputMonto = document.getElementById('input-monto');
                const areaRegistro = document.getElementById('area-registrar-gasto');
                if (inputMonto && areaRegistro) {
                    setTimeout(() => {
                        areaRegistro.scrollIntoView({ behavior: 'instant', block: 'start' });
                        inputMonto.focus();
                    }, 100);
                }
            } else if (action === 'simulador') {
                document.getElementById('btn-abrir-simulador').click();
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

function mostrarPantallaPrincipal() {
    transicionPantalla(() => {
        document.querySelectorAll('.transicion-seccion').forEach(s => s.classList.add('oculto'));
        document.getElementById('pantalla-principal').classList.remove('oculto');
        document.getElementById('area-registrar-gasto').classList.remove('oculto');
    });
    
    viewMonth = hoy.getMonth();
    viewYear = hoy.getFullYear();
    setFiltroHistorial('todos', null);
    resetFiltrosHistorialState();
    resetFormularioGasto(setGastoEnEdicion);
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
    
    setTimeout(() => {
        const inputMonto = document.getElementById('input-monto');
        if (inputMonto) {
            inputMonto.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, INTERACTION_CONFIG.KEYBOARD_FOCUS_DELAY_MS || 300);
}

document.getElementById('btn-mostrar-mais-historial')?.addEventListener('click', () => {
    toggleMostrarTodosGastos();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('btn-limpar-dia-calendario')?.addEventListener('click', () => {
    limparDiaCalendario();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('btn-prev-month').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    setFiltroHistorial('todos', null);
    resetFiltrosHistorialState();
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('btn-next-month').addEventListener('click', () => {
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

inputMoneda.addEventListener('change', () => {
    state.monedaActual = inputMoneda.value;
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

document.getElementById('btn-wizard-next-1').addEventListener('click', () => {
    const inputVal = parseFloat(inputPresupuesto.value);
    const nuevoPresupuesto = modoActual === 'directo' ? Math.round((isNaN(inputVal) ? 0 : inputVal) * 100) : presupuestoCalculadoTemporalCents;
    
    if (nuevoPresupuesto <= 0) {
        alert(t('errorBudget'));
        return;
    }
    state.presupuestoMensual = nuevoPresupuesto;
    renderCuentasList(state);
    goWizardStep(2);
});

document.getElementById('btn-wizard-back-1').addEventListener('click', () => goWizardStep(1));
document.getElementById('btn-wizard-next-2').addEventListener('click', () => goWizardStep(3));
document.getElementById('btn-wizard-back-2').addEventListener('click', () => goWizardStep(2));

document.getElementById('form-onboarding-boleto').addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('input-onboarding-boleto-desc').value.trim();
    const montoInput = document.getElementById('input-onboarding-boleto-monto');
    const montoCents = parseInt(montoInput.dataset.cents || '0', 10);
    const dia = parseInt(document.getElementById('input-onboarding-boleto-dia').value, 10);
    const categoria = document.getElementById('input-onboarding-boleto-categoria').value;
    
    if (desc && montoCents > 0 && dia >= 1 && dia <= 31) {
        const id = 'bol_' + Date.now();
        state.boletos = [...state.boletos, { id, desc, monto: montoCents, diaVencimiento: dia, categoria }];
        
        document.getElementById('input-onboarding-boleto-desc').value = '';
        montoInput.value = '';
        montoInput.dataset.cents = '0';
        document.getElementById('input-onboarding-boleto-dia').value = '';
        
        showToast("✨ " + t('btnSave'));
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

document.getElementById('form-onboarding-cuenta').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('input-onboarding-cuenta-nombre').value.trim();
    const tipo = document.getElementById('input-onboarding-cuenta-tipo').value;
    const cierreInput = document.getElementById('input-onboarding-cuenta-cierre').value;
    
    if (nombre) {
        const id = 'acc_' + Date.now();
        state.cuentas = [...state.cuentas, { 
            id, 
            nombre, 
            tipo, 
            cierreTC: tipo === 'credit' && cierreInput ? parseInt(cierreInput, 10) : null 
        }];
        
        document.getElementById('input-onboarding-cuenta-nombre').value = '';
        document.getElementById('input-onboarding-cuenta-cierre').value = '';
        showToast("✨ " + t('btnSave'));
        renderCuentasList(state);
    }
});

document.getElementById('btn-comenzar').addEventListener('click', () => {
    if (!document.getElementById('area-gastos-previos').classList.contains('oculto')) {
        const inicialCents = Math.round((parseFloat(document.getElementById('input-gastos-iniciales').value) || 0) * 100);
        if (inicialCents > 0) {
            const defaultCuenta = state.cuentas.length > 0 ? state.cuentas[0].id : null;
            addExpense({ 
                id: Date.now(), 
                monto: inicialCents, 
                desc: t('prevExpense'), 
                fecha: new Date().toISOString(), 
                categoria: 'otros_previo',
                cuentaId: defaultCuenta
            });
        }
    }
    
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
            const match = state.historialGlobal.slice().reverse().find(g => g.desc.toLowerCase() === query);
            if (match) {
                const inputHidden = document.getElementById('input-categoria');
                const chipTarget = document.querySelector(`.cat-chip[data-id="${match.categoria}"]`);
                if (chipTarget && inputHidden) {
                    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
                    chipTarget.classList.add('active');
                    inputHidden.value = match.categoria;
                    chipTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        }
    }, INTERACTION_CONFIG.DEBOUNCE_DELAY_MS);
});

// CRIAR NOVA CATEGORIA PERSONALIZADA
const btnToggleNuevaCat = document.getElementById('btn-toggle-nueva-cat');
const areaNuevaCat = document.getElementById('area-nueva-categoria');
const btnGuardarNuevaCat = document.getElementById('btn-guardar-nueva-cat');

if (btnToggleNuevaCat && areaNuevaCat) {
    btnToggleNuevaCat.addEventListener('click', () => {
        areaNuevaCat.classList.toggle('oculto');
    });
}

if (btnGuardarNuevaCat) {
    btnGuardarNuevaCat.addEventListener('click', () => {
        const nombreInput = document.getElementById('input-nueva-cat-nombre');
        const emojiInput = document.getElementById('input-nueva-cat-emoji');
        const nombre = nombreInput.value.trim();
        const emoji = emojiInput.value.trim() || '📌';

        if (nombre) {
            const newCat = { id: 'custom_' + Date.now(), emoji, nombre };
            state.categoriasCustom = [...state.categoriasCustom, newCat];
            nombreInput.value = '';
            emojiInput.value = '';
            areaNuevaCat.classList.add('oculto');
            renderizarSelectCategorias(state.categoriasCustom);
            showToast("✨ " + t('btnSave'));
        }
    });
}

function atualizarCheckboxMes() {
    const cuentaId = document.getElementById('input-cuenta-origen').value;
    const inputFecha = document.getElementById('input-fecha-gasto').value;
    const checkbox = document.getElementById('checkbox-mes-siguiente');
    
    if (!cuentaId || !checkbox) return;
    const cuenta = state.cuentas.find(c => c.id === cuentaId);
    const dataBase = inputFecha ? new Date(inputFecha + 'T12:00:00') : new Date();
    if (cuenta && cuenta.tipo === 'credit' && cuenta.cierreTC && dataBase.getDate() > cuenta.cierreTC) {
        checkbox.checked = true;
    } else {
        checkbox.checked = false;
    }
}

document.getElementById('input-cuenta-origen').addEventListener('change', atualizarCheckboxMes);
document.getElementById('input-fecha-gasto').addEventListener('change', atualizarCheckboxMes);

document.getElementById('form-gasto').addEventListener('submit', (e) => {
    e.preventDefault();
    const inputMonto = document.getElementById('input-monto');
    const montoCents = parseInt(inputMonto.dataset.cents || '0', 10);
    const desc = document.getElementById('input-desc').value.trim();
    const cat = document.getElementById('input-categoria').value;
    
    const cuentaId = document.getElementById('input-cuenta-origen').value;
    if (!cuentaId) {
        showToast("⚠️ Erro: Selecione uma conta de origem.");
        return;
    }
    
    const inputCuotas = document.getElementById('input-cuotas');
    const cuotas = parseInt(inputCuotas?.value, 10) || 1;
    const inputFecha = document.getElementById('input-fecha-gasto').value;
    const dataBase = inputFecha ? new Date(inputFecha + 'T12:00:00') : new Date();
    
    const checkboxMarcado = document.getElementById('checkbox-mes-siguiente').checked;
    const startOffset = checkboxMarcado ? 1 : 0;
    
    if (!isNaN(montoCents) && montoCents > 0 && desc) {
        const wasEditing = gastoEnEdicion;
        const baseIso = dataBase.toISOString();
        
        if (wasEditing) {
            let mesEfectivo = undefined;
            let fechaIso = baseIso;
            if (startOffset > 0) {
                const futureDate = new Date(dataBase.getFullYear(), dataBase.getMonth() + startOffset, 1, 12, 0, 0);
                mesEfectivo = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
                fechaIso = futureDate.toISOString();
            }
            updateExpense(gastoEnEdicion, { monto: montoCents, desc, categoria: cat, mesEfectivo, cuentaId, fecha: fechaIso });
            resetFormularioGasto(setGastoEnEdicion);
        } else {
            const montoCuotaNormal = Math.floor(montoCents / cuotas);
            const montoUltimaCuota = montoCents - (montoCuotaNormal * (cuotas - 1));
            
            const nuevasCuotas = [];
            const groupId = 'group_' + Date.now();
            for (let i = 0; i < cuotas; i++) {
                const totalMonthOffset = startOffset + i;
                let mesEfectivo = undefined;
                let fechaIso = baseIso;
                
                if (totalMonthOffset > 0) {
                    const futureDate = new Date(dataBase.getFullYear(), dataBase.getMonth() + totalMonthOffset, 1, 12, 0, 0);
                    mesEfectivo = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
                    fechaIso = futureDate.toISOString();
                }
                
                const descCuota = cuotas > 1 ? `${desc} (${i + 1}/${cuotas})` : desc;
                const montoMapeado = (i === cuotas - 1) ? montoUltimaCuota : montoCuotaNormal;
                
                nuevasCuotas.push({
                    id: Date.now() + i,
                    groupId: groupId,
                    monto: montoMapeado,
                    desc: descCuota,
                    fecha: fechaIso,
                    categoria: cat,
                    mesEfectivo,
                    cuentaId
                });
            }
            addMultipleExpenses(nuevasCuotas);
            resetFormularioGasto(setGastoEnEdicion);
        }
        
        if (document.activeElement) document.activeElement.blur();
        if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.SHORT_MS);
        showToast(wasEditing ? "✨ " + t('btnEdit') : "✨ " + t('btnAdd'));
    }
});

// TELA DE GESTÃO DE CONTAS & FORMULÁRIO DEDICADO
document.getElementById('btn-menu-cuentas').addEventListener('click', () => {
    if (settingsDropdown) settingsDropdown.classList.add('oculto');
    history.pushState({ view: 'cuentas' }, '');
    
    transicionPantalla(() => {
        document.querySelectorAll('.transicion-seccion').forEach(s => s.classList.add('oculto'));
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
    formCuenta.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('input-cuenta-nombre').value.trim();
        const tipo = document.getElementById('input-cuenta-tipo').value;
        const cierreInput = document.getElementById('input-cuenta-cierre').value;
        
        if (nombre) {
            const id = 'acc_' + Date.now();
            state.cuentas = [...state.cuentas, { 
                id, 
                nombre, 
                tipo, 
                cierreTC: tipo === 'credit' && cierreInput ? parseInt(cierreInput, 10) : null 
            }];
            
            document.getElementById('input-cuenta-nombre').value = '';
            document.getElementById('input-cuenta-cierre').value = '';
            showToast("✨ " + t('btnSave'));
            renderCuentasList(state);
        }
    });
}

// TELA DE BOLETOS E GASTOS FIJOS
document.getElementById('btn-menu-boletos').addEventListener('click', () => {
    if (settingsDropdown) settingsDropdown.classList.add('oculto');
    history.pushState({ view: 'boletos' }, '');
    
    transicionPantalla(() => {
        document.querySelectorAll('.transicion-seccion').forEach(s => s.classList.add('oculto'));
        document.getElementById('pantalla-boletos').classList.remove('oculto');
    });
    renderBoletosList(state);
});

document.getElementById('btn-cerrar-boletos')?.addEventListener('click', mostrarPantallaPrincipal);

document.getElementById('form-boleto').addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('input-boleto-desc').value.trim();
    const montoInput = document.getElementById('input-boleto-monto');
    const montoCents = parseInt(montoInput.dataset.cents || '0', 10);
    const dia = parseInt(document.getElementById('input-boleto-dia').value, 10);
    const categoria = document.getElementById('input-boleto-categoria').value;
    
    if (desc && montoCents > 0 && dia >= 1 && dia <= 31) {
        const id = 'bol_' + Date.now();
        state.boletos = [...state.boletos, { id, desc, monto: montoCents, diaVencimiento: dia, categoria }];
        
        document.getElementById('input-boleto-desc').value = '';
        montoInput.value = '';
        montoInput.dataset.cents = '0';
        document.getElementById('input-boleto-dia').value = '';
        showToast("✨ " + t('btnSave'));
        renderBoletosList(state);
    }
});

document.getElementById('btn-editar-presupuesto').addEventListener('click', () => {
    history.pushState({ view: 'configuracion' }, '');
    resetFormularioGasto(setGastoEnEdicion);
    
    transicionPantalla(() => {
        document.querySelectorAll('.transicion-seccion').forEach(s => s.classList.add('oculto'));
        document.getElementById('pantalla-configuracion').classList.remove('oculto');
        document.getElementById('wizard-step-1').classList.remove('oculto');
        tabDirecto.click();
        document.getElementById('wizard-step-2').classList.add('oculto');
        document.getElementById('wizard-step-3').classList.add('oculto');
        document.getElementById('wizard-ind-1').classList.add('active');
        document.getElementById('wizard-ind-2').classList.remove('active');
        document.getElementById('wizard-ind-3').classList.remove('active');
    });
    
    inputPresupuesto.value = (state.presupuestoMensual / 100).toString();
    inputMoneda.value = state.monedaActual;
});

document.getElementById('btn-exportar').addEventListener('click', () => {
    const backup = {
        historial: state.historialGlobal,
        cuentas: state.cuentas,
        boletos: state.boletos,
        presupuesto: state.presupuestoMensual,
        patrimonio: state.historialPatrimonio
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const anchor = document.createElement('a');
    anchor.href = dataStr;
    anchor.download = "floux_backup.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
});

document.getElementById('btn-importar').addEventListener('click', () => {
    document.getElementById('input-archivo').click();
});

// IMPORTAÇÃO COM VALIDAÇÃO DE SCHEMA COMPLETA
document.getElementById('input-archivo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > INTERACTION_CONFIG.MAX_IMPORT_FILE_SIZE_BYTES) {
        showToast(t('errFileSize'));
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            if (!isValidBackupSchema(data)) {
                showToast(t('errFormat'));
                e.target.value = '';
                return;
            }

            const historyToImport = Array.isArray(data) ? data : (data.historial || []);
            resetFormularioGasto(setGastoEnEdicion);

            if (confirm(t('confirmOverwrite'))) {
                if(!Array.isArray(data)) {
                    if (data.cuentas) state.cuentas = data.cuentas;
                    if (data.boletos) state.boletos = data.boletos;
                    if (data.patrimonio) state.historialPatrimonio = data.patrimonio;
                }
                replaceHistory(historyToImport);
            } else {
                replaceHistory(state.historialGlobal.concat(historyToImport));
            }
            showToast("✨ Dados importados com sucesso!");
        } catch (err) {
            showToast(t('errInvalid'));
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('btn-reiniciar').addEventListener('click', () => {
    if (settingsDropdown) settingsDropdown.classList.add('oculto');
    if(confirm(t('alertReset'))) {
        resetFormularioGasto(setGastoEnEdicion);
        localStorage.clear();
        const req = indexedDB.open('FlouxDB', 1);
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('floux_store', 'readwrite');
            tx.objectStore('floux_store').clear();
            tx.oncomplete = () => {
                db.close();
                location.reload();
            };
        };
        req.onerror = () => location.reload();
    }
});

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

initFlouxVision(
    () => {
        transicionPantalla(() => {
            document.querySelectorAll('.transicion-seccion').forEach(s => s.classList.add('oculto'));
            document.getElementById('pantalla-simulador').classList.remove('oculto');
        });
    },
    mostrarPantallaPrincipal
);

initFlouxVault(
    () => {
        transicionPantalla(() => {
            document.querySelectorAll('.transicion-seccion').forEach(s => s.classList.add('oculto'));
            document.getElementById('pantalla-flouxvault').classList.remove('oculto');
        });
    },
    mostrarPantallaPrincipal
);

initSwipeActions(document.getElementById('lista-historial'), INTERACTION_CONFIG.SWIPE, {
    onDelete: (id) => {
        const gasto = state.historialGlobal.find(g => g.id === id);
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
                    state.historialGlobal = state.historialGlobal.filter(g => !idsToRemove.includes(g.id));
                    
                    if (gastoEnEdicion && idsToRemove.includes(gastoEnEdicion)) resetFormularioGasto(setGastoEnEdicion);
                    if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.DELETE_PATTERN_MS);
                    showToast("✨ " + t('toastAllDeleted'));
                    return;
                }
            }
        }
        
        removeExpense(id);
        if (gastoEnEdicion === id) resetFormularioGasto(setGastoEnEdicion);
        if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.DELETE_PATTERN_MS);
        showToast("✨ " + t('toastDeleted'));
    },
    onEdit: (id) => {
        const gasto = state.historialGlobal.find(g => g.id === id);
        if (gasto) {
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
                warnEl.innerText = "⚠️ " + t('warnEditInstallmentMsg');
                warnEl.style.display = 'block';
                showToast("⚠️ " + t('warnEditInstallment'));
            } else {
                warnEl.style.display = 'none';
            }
            
            setGastoEnEdicion(id);
            document.getElementById('btn-guardar-gasto').innerText = t('btnEdit');
            document.getElementById('input-monto').focus();
            window.scrollTo({ top: document.getElementById('form-gasto').offsetTop - 20, behavior: 'smooth' });
        }
    }
});

init();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
}

window.addEventListener('popstate', () => {
    mostrarPantallaPrincipal();
});