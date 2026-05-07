import { state, loadStore, saveStore, isValidoHistorialSchema, STORAGE_KEYS, addExpense, updateExpense, removeExpense, replaceHistory } from './store.js';
import { currentLang, t, setLangStr, formatCurrency } from './i18n.js';
import { aplicarTraduccion, renderizarSelectCategorias, actualizarInterfaz, resetFormularioGasto, showToast } from './ui.js';
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

const inputIngresos = document.getElementById('input-ingresos');
const inputFijos = document.getElementById('input-fijos');
const inputPctViver = document.getElementById('input-pct-viver');
const inputPctLivre = document.getElementById('input-pct-livre');
const displayCalculado = document.getElementById('display-calculado');
const inputMoneda = document.getElementById('input-moneda');
const inputPresupuesto = document.getElementById('input-presupuesto');

const btnPrivacidade = document.getElementById('btn-privacidade');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const settingsDropdown = document.getElementById('settings-dropdown');

if (btnSettingsToggle && settingsDropdown) {
    btnSettingsToggle.addEventListener('click', (e) => {
        e.stopPropagation(); 
        settingsDropdown.classList.toggle('oculto');
    });
    document.addEventListener('click', (e) => {
        if (!settingsDropdown.contains(e.target) && !btnSettingsToggle.contains(e.target)) {
            settingsDropdown.classList.add('oculto');
        }
    });
}

async function actualizarModoPrivacidade() {
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
        state.privacyMode = !state.privacyMode;
        actualizarModoPrivacidade();
        await saveStore();
    });
}

async function init() {
    const hasData = await loadStore();
    inputMoneda.value = state.monedaActual;
    actualizarModoPrivacidade();
    
    const activeFlag = document.querySelector(`.flag[data-lang="${currentLang}"]`);
    if (activeFlag) activeFlag.classList.add('active');
    
    aplicarTraduccion(gastoEnEdicion);
    renderizarSelectCategorias(state.categoriasCustom);

    if (hasData) {
        if (localStorage.getItem(STORAGE_KEYS.MES_GUARDADO) === null || parseInt(localStorage.getItem(STORAGE_KEYS.MES_GUARDADO)) !== mesActual) {
            localStorage.setItem(STORAGE_KEYS.MES_GUARDADO, mesActual);
        }
        mostrarPantallaPrincipal();

        // PWA Shortcut Actions Logic
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action) {
            if (action === 'add-expense') {
                const areaRegistro = document.getElementById('area-registrar-gasto');
                if (areaRegistro) {
                    areaRegistro.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => document.getElementById('input-monto').focus(), INTERACTION_CONFIG.KEYBOARD_FOCUS_DELAY_MS);
                }
            } else if (action === 'simulador') {
                document.getElementById('btn-abrir-simulador').click();
            }
            
            // Clean the URL to prevent re-triggering on manual refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

function mostrarPantallaPrincipal() {
    document.getElementById('pantalla-configuracion').classList.add('oculto');
    document.getElementById('pantalla-simulador').classList.add('oculto');
    document.getElementById('pantalla-principal').classList.remove('oculto');
    viewMonth = hoy.getMonth();
    viewYear = hoy.getFullYear();
    document.getElementById('btn-next-month').disabled = true;
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
}

async function guardarYMostrar() {
    await saveStore();
    mostrarPantallaPrincipal();
}

document.getElementById('btn-prev-month').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    document.getElementById('btn-next-month').disabled = false;
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('btn-next-month').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    if (viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear()) {
        document.getElementById('btn-next-month').disabled = true;
    }
    actualizarInterfaz(state, viewMonth, viewYear, hoy);
});

document.getElementById('lang-container').addEventListener('click', (e) => {
    if (e.target.classList.contains('flag')) {
        setLangStr(e.target.getAttribute('data-lang'));
        document.querySelectorAll('.flag').forEach(f => f.classList.remove('active'));
        e.target.classList.add('active');
        aplicarTraduccion(gastoEnEdicion);
        renderizarSelectCategorias(state.categoriasCustom);
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
    modoActual = 'directo'; tabDirecto.classList.add('active'); tabCalc.classList.remove('active'); 
    modoDirecto.classList.remove('oculto'); modoCalculadora.classList.add('oculto'); 
});
tabCalc.addEventListener('click', () => { 
    modoActual = 'calculadora'; tabCalc.classList.add('active'); tabDirecto.classList.remove('active'); 
    modoCalculadora.classList.remove('oculto'); modoDirecto.classList.add('oculto'); 
});

document.querySelectorAll('.input-calc').forEach(input => {
    input.addEventListener('input', () => {
        const rentaCents = Math.round((parseFloat(inputIngresos?.value) || 0) * 100);
        const fixosCents = Math.round((parseFloat(inputFijos?.value) || 0) * 100);
        const pctViver = parseFloat(inputPctViver?.value) || 0;
        const pctLivre = parseFloat(inputPctLivre?.value) || 0;
        const liquidezTotalCents = Math.round(rentaCents * ((pctViver + pctLivre) / 100));
        
        presupuestoCalculadoTemporalCents = Math.max(0, liquidezTotalCents - fixosCents);
        displayCalculado.innerText = formatCurrency(presupuestoCalculadoTemporalCents, inputMoneda.value);
    });
});

document.getElementById('btn-comenzar').addEventListener('click', async () => {
    const inputVal = parseFloat(inputPresupuesto.value);
    state.presupuestoMensual = modoActual === 'directo' ? Math.round((isNaN(inputVal) ? 0 : inputVal) * 100) : presupuestoCalculadoTemporalCents;
    state.monedaActual = inputMoneda.value;
    
    if (state.presupuestoMensual <= 0) {
        alert(t('errorBudget'));
        return;
    }

    if (!document.getElementById('area-gastos-previos').classList.contains('oculto')) {
        const inicialCents = Math.round((parseFloat(document.getElementById('input-gastos-iniciales').value) || 0) * 100);
        if (inicialCents > 0) addExpense({ id: Date.now(), monto: inicialCents, desc: t('prevExpense'), fecha: new Date().toISOString(), categoria: 'otros_previo' });
    }

    localStorage.setItem(STORAGE_KEYS.MES_GUARDADO, hoy.getMonth()); 
    await guardarYMostrar();
});

let autoCatDebounceTimer;
document.getElementById('input-desc').addEventListener('input', (e) => {
    clearTimeout(autoCatDebounceTimer);
    autoCatDebounceTimer = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 2) {
            const match = state.historialGlobal.slice().reverse().find(g => g.desc.toLowerCase() === query);
            if (match) {
                const select = document.getElementById('input-categoria');
                if (Array.from(select.options).some(opt => opt.value === match.categoria)) select.value = match.categoria;
            }
        }
    }, INTERACTION_CONFIG.DEBOUNCE_DELAY_MS);
});

document.getElementById('form-gasto').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const montoCents = Math.round(parseFloat(document.getElementById('input-monto').value) * 100);
    const desc = document.getElementById('input-desc').value.trim();
    const cat = document.getElementById('input-categoria').value;
    
    if (!isNaN(montoCents) && montoCents > 0 && desc) {
        const wasEditing = gastoEnEdicion;
        if (wasEditing) {
            updateExpense(gastoEnEdicion, { monto: montoCents, desc, categoria: cat });
            resetFormularioGasto(setGastoEnEdicion);
        } else {
            addExpense({ id: Date.now(), monto: montoCents, desc, fecha: new Date().toISOString(), categoria: cat });
            document.getElementById('input-monto').value = '';
            document.getElementById('input-desc').value = '';
        }
        await guardarYMostrar();
        showToast(wasEditing ? "✅ " + t('btnEdit') : "✅ " + t('btnAdd'));
    }
});

document.getElementById('btn-toggle-nueva-cat').addEventListener('click', () => {
    document.getElementById('area-nueva-categoria').classList.toggle('oculto');
});

document.getElementById('btn-guardar-nueva-cat').addEventListener('click', () => {
    const nombre = document.getElementById('input-nueva-cat-nombre').value.trim();
    const emoji = document.getElementById('input-nueva-cat-emoji').value.trim();
    if (nombre && emoji) {
        const id = 'custom_' + Date.now();
        state.categoriasCustom.push({ id, nombre, emoji });
        renderizarSelectCategorias(state.categoriasCustom);
        document.getElementById('input-categoria').value = id;
        document.getElementById('input-nueva-cat-nombre').value = '';
        document.getElementById('input-nueva-cat-emoji').value = '';
        document.getElementById('area-nueva-categoria').classList.add('oculto');
    }
});

document.getElementById('btn-editar-presupuesto').addEventListener('click', () => {
    history.pushState({ view: 'configuracion' }, '');
    if (settingsDropdown) settingsDropdown.classList.add('oculto');
    resetFormularioGasto(setGastoEnEdicion); 
    document.getElementById('pantalla-principal').classList.add('oculto');
    document.getElementById('pantalla-simulador').classList.add('oculto');
    document.getElementById('pantalla-configuracion').classList.remove('oculto');
    document.getElementById('area-gastos-previos').classList.add('oculto');
    tabDirecto.click();
    inputPresupuesto.value = (state.presupuestoMensual / 100).toFixed(2);
    inputMoneda.value = state.monedaActual; 
});

document.getElementById('btn-exportar').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.historialGlobal));
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

document.getElementById('input-archivo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > INTERACTION_CONFIG.MAX_IMPORT_FILE_SIZE_BYTES) {
        alert("Error: El archivo excede el tamaño máximo permitido (5MB).");
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if (isValidoHistorialSchema(data)) {
                resetFormularioGasto(setGastoEnEdicion); 
                if (confirm("Aceptar: Sobrescribir todos los datos.\nCancelar: Combinar con datos actuales.")) replaceHistory(data);
                else replaceHistory(state.historialGlobal.concat(data));
                await guardarYMostrar();
            } else alert("Error: El archivo no tiene el formato correcto.");
        } catch (err) { alert("Error: Archivo inválido o corrupto."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
});

document.getElementById('btn-reiniciar').addEventListener('click', () => { 
    if(confirm(t('alertReset'))) { 
        resetFormularioGasto(setGastoEnEdicion); 
        indexedDB.deleteDatabase('FlouxDB');
        localStorage.clear(); 
        location.reload(); 
    } 
});

const lsimMonto = document.getElementById('input-lsim-monto');
const sliderAnos = document.getElementById('slider-lsim-anos');
const sliderTasa = document.getElementById('slider-lsim-tasa');

document.getElementById('btn-abrir-simulador').addEventListener('click', () => {
    history.pushState({ view: 'simulador' }, '');
    document.getElementById('pantalla-principal').classList.add('oculto');
    document.getElementById('pantalla-simulador').classList.remove('oculto');
    actualizarPerdidaInvisibleUI(); 
});

document.getElementById('btn-cerrar-simulador').addEventListener('click', () => {
    document.getElementById('pantalla-simulador').classList.add('oculto');
    document.getElementById('pantalla-principal').classList.remove('oculto');
});

function calcularInteresCompuesto(pCents, tVal, rVal) {
    const futureValueCents = pCents * Math.pow(1 + (rVal / 100), tVal);
    return { futureValueCents, differenceCents: futureValueCents - pCents };
}

function actualizarPerdidaInvisibleUI() {
    const pCents = Math.round((parseFloat(lsimMonto.value) || 0) * 100);
    const tVal = parseFloat(sliderAnos.value);
    const rVal = parseFloat(sliderTasa.value);
    
    const pAnos = (tVal - sliderAnos.min) / (sliderAnos.max - sliderAnos.min);
    const pTasa = (rVal - sliderTasa.min) / (sliderTasa.max - sliderTasa.min);
    sliderAnos.style.setProperty('--fill', `calc(${pAnos * 100}% + ${16 - (pAnos * 32)}px)`);
    sliderTasa.style.setProperty('--fill', `calc(${pTasa * 100}% + ${16 - (pTasa * 32)}px)`);
    document.getElementById('val-anos').innerText = tVal;
    document.getElementById('val-tasa').innerText = rVal.toFixed(1) + '%';
    
    const { futureValueCents, differenceCents } = calcularInteresCompuesto(pCents, tVal, rVal);
    document.getElementById('lsim-val-cost').innerText = formatCurrency(pCents, state.monedaActual);
    document.getElementById('display-lsim-resultado').innerText = formatCurrency(futureValueCents, state.monedaActual);
    document.getElementById('lsim-val-diff').innerText = formatCurrency(differenceCents, state.monedaActual);
    
    const barCost = document.getElementById('lsim-bar-cost');
    const barFuture = document.getElementById('lsim-bar-future');
    if (futureValueCents > 0) {
        barCost.style.width = `${(pCents / futureValueCents) * 100}%`;
        barFuture.style.width = '100%';
    } else {
        barCost.style.width = '0%';
        barFuture.style.width = '0%';
    }
}

[lsimMonto, sliderAnos, sliderTasa].forEach(input => input.addEventListener('input', actualizarPerdidaInvisibleUI));

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

// Initialize extracted swipe logic
initSwipeActions(document.getElementById('lista-historial'), INTERACTION_CONFIG.SWIPE, {
    onDelete: async (id) => {
        removeExpense(id);
        if (gastoEnEdicion === id) resetFormularioGasto(setGastoEnEdicion);
        if (navigator.vibrate) navigator.vibrate(INTERACTION_CONFIG.HAPTICS.DELETE_PATTERN_MS);
        await guardarYMostrar();
        showToast("🗑️ Eliminado");
    },
    onEdit: (id) => {
        const gasto = state.historialGlobal.find(g => g.id === id);
        if (gasto) {
            document.getElementById('input-monto').value = (gasto.monto / 100).toFixed(2);
            document.getElementById('input-desc').value = gasto.desc;
            document.getElementById('input-categoria').value = gasto.categoria;
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
    document.getElementById('pantalla-simulador').classList.add('oculto');
    document.getElementById('pantalla-configuracion').classList.add('oculto');
    document.getElementById('pantalla-principal').classList.remove('oculto');
});