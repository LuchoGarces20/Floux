import { state, loadStore, saveStore, isValidoHistorialSchema, STORAGE_KEYS } from './store.js';
import { currentLang, t, setLangStr } from './i18n.js';
import { aplicarTraduccion, renderizarSelectCategorias, actualizarInterfaz, resetFormularioGasto, showToast } from './ui.js';

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

// --- Lógica do Menu Dropdown (Configurações) ---
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

// --- Lógica do Modo Privacidade ---
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
    btnPrivacidade.addEventListener('click', () => {
        state.privacyMode = !state.privacyMode;
        actualizarModoPrivacidade();
        saveStore();
    });
}

// ----------------------------------
function init() {
    const hasData = loadStore();
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

function guardarYMostrar() {
    saveStore();
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
        const porcentajeLiquidez = (pctViver + pctLivre) / 100;
        const liquidezTotalCents = Math.round(rentaCents * porcentajeLiquidez);
        
        presupuestoCalculadoTemporalCents = Math.max(0, liquidezTotalCents - fixosCents);
        const localeStr = currentLang === 'es' ? 'es-ES' : (currentLang === 'pt' ? 'pt-BR' : 'en-US');
        displayCalculado.innerText = new Intl.NumberFormat(localeStr, { style: 'currency', currency: inputMoneda.value }).format(presupuestoCalculadoTemporalCents / 100);
    });
});

document.getElementById('btn-comenzar').addEventListener('click', () => {
    const inputVal = parseFloat(inputPresupuesto.value);
    const presupuestoDirectoCents = Math.round((isNaN(inputVal) ? 0 : inputVal) * 100);
    
    state.presupuestoMensual = modoActual === 'directo' ? presupuestoDirectoCents : presupuestoCalculadoTemporalCents;
    state.monedaActual = inputMoneda.value;
    
    if (state.presupuestoMensual <= 0) {
        alert(t('errorBudget'));
        return;
    }

    if (!document.getElementById('area-gastos-previos').classList.contains('oculto')) {
        const inputInicial = parseFloat(document.getElementById('input-gastos-iniciales').value);
        const inicialCents = Math.round((isNaN(inputInicial) ? 0 : inputInicial) * 100);
        if (inicialCents > 0) state.historialGlobal.push({ id: Date.now(), monto: inicialCents, desc: t('prevExpense'), fecha: new Date().toISOString(), categoria: 'otros_previo' });
    }

    localStorage.setItem(STORAGE_KEYS.MES_GUARDADO, hoy.getMonth()); 
    guardarYMostrar();
});

// Auto-categorização Histórica
document.getElementById('input-desc').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length > 2) {
        const match = state.historialGlobal.slice().reverse().find(g => g.desc.toLowerCase() === query);
        if (match) {
            const select = document.getElementById('input-categoria');
            if (Array.from(select.options).some(opt => opt.value === match.categoria)) {
                select.value = match.categoria;
            }
        }
    }
});

document.getElementById('form-gasto').addEventListener('submit', (e) => {
    e.preventDefault(); 
    const monto = parseFloat(document.getElementById('input-monto').value);
    const montoCents = Math.round(monto * 100);
    const desc = document.getElementById('input-desc').value.trim();
    const cat = document.getElementById('input-categoria').value;
    
    if (!isNaN(montoCents) && montoCents > 0 && desc) {
        const wasEditing = gastoEnEdicion;
        if (gastoEnEdicion) {
            const index = state.historialGlobal.findIndex(g => g.id === gastoEnEdicion);
            if (index !== -1) {
                state.historialGlobal[index].monto = montoCents;
                state.historialGlobal[index].desc = desc;
                state.historialGlobal[index].categoria = cat;
            }
            resetFormularioGasto(setGastoEnEdicion);
        } else {
            state.historialGlobal.push({ id: Date.now(), monto: montoCents, desc: desc, fecha: new Date().toISOString(), categoria: cat });
            document.getElementById('input-monto').value = '';
            document.getElementById('input-desc').value = '';
        }
        guardarYMostrar();
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
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if (isValidoHistorialSchema(data)) {
                resetFormularioGasto(setGastoEnEdicion); 
                if (confirm("Aceptar: Sobrescribir todos los datos.\nCancelar: Combinar con datos actuales.")) {
                    state.historialGlobal = data;
                } else {
                    state.historialGlobal = state.historialGlobal.concat(data);
                }
                guardarYMostrar();
            } else {
                alert("Error: El arquivo não tem o formato correto.");
            }
        } catch (err) {
            alert("Error: Arquivo inválido ou corrupto.");
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
});

document.getElementById('btn-reiniciar').addEventListener('click', () => { 
    if(confirm(t('alertReset'))) { 
        resetFormularioGasto(setGastoEnEdicion); 
        localStorage.clear(); 
        location.reload(); 
    } 
});

const pantallaPrincipal = document.getElementById('pantalla-principal');
const pantallaSimulador = document.getElementById('pantalla-simulador');
const btnAbrirSimulador = document.getElementById('btn-abrir-simulador');
const btnCerrarSimulador = document.getElementById('btn-cerrar-simulador');
const lsimMonto = document.getElementById('input-lsim-monto');
const sliderAnos = document.getElementById('slider-lsim-anos');
const sliderTasa = document.getElementById('slider-lsim-tasa');
const valAnos = document.getElementById('val-anos');
const valTasa = document.getElementById('val-tasa');
const lsimValCost = document.getElementById('lsim-val-cost');
const lsimValFuture = document.getElementById('display-lsim-resultado');
const lsimValDiff = document.getElementById('lsim-val-diff');
const barCost = document.getElementById('lsim-bar-cost');
const barFuture = document.getElementById('lsim-bar-future');

btnAbrirSimulador.addEventListener('click', () => {
    pantallaPrincipal.classList.add('oculto');
    pantallaSimulador.classList.remove('oculto');
    calcularPerdidaInvisible(); 
});

btnCerrarSimulador.addEventListener('click', () => {
    pantallaSimulador.classList.add('oculto');
    pantallaPrincipal.classList.remove('oculto');
});

function calcularPerdidaInvisible() {
    const pCents = Math.round((parseFloat(lsimMonto.value) || 0) * 100);
    const tVal = parseFloat(sliderAnos.value);
    const rVal = parseFloat(sliderTasa.value);
    
    const pAnos = (tVal - sliderAnos.min) / (sliderAnos.max - sliderAnos.min);
    const pTasa = (rVal - sliderTasa.min) / (sliderTasa.max - sliderTasa.min);
    
    sliderAnos.style.setProperty('--fill', `calc(${pAnos * 100}% + ${16 - (pAnos * 32)}px)`);
    sliderTasa.style.setProperty('--fill', `calc(${pTasa * 100}% + ${16 - (pTasa * 32)}px)`);
    
    valAnos.innerText = tVal;
    valTasa.innerText = rVal.toFixed(1) + '%';
    
    const r = rVal / 100;
    const futureValueCents = pCents * Math.pow(1 + r, tVal);
    const differenceCents = futureValueCents - pCents;
    
    const localeStr = currentLang === 'es' ? 'es-ES' : (currentLang === 'pt' ? 'pt-BR' : 'en-US');
    const formatter = new Intl.NumberFormat(localeStr, { style: 'currency', currency: state.monedaActual });
    
    lsimValCost.innerText = formatter.format(pCents / 100);
    lsimValFuture.innerText = formatter.format(futureValueCents / 100);
    lsimValDiff.innerText = formatter.format(differenceCents / 100);
    
    if (futureValueCents > 0) {
        const costPercentage = (pCents / futureValueCents) * 100;
        barCost.style.width = `${costPercentage}%`;
        barFuture.style.width = '100%';
    } else {
        barCost.style.width = '0%';
        barFuture.style.width = '0%';
    }
}

[lsimMonto, sliderAnos, sliderTasa].forEach(input => {
    input.addEventListener('input', calcularPerdidaInvisible);
});

const fabGasto = document.getElementById('btn-fab-gasto');

if (fabGasto) {
    fabGasto.addEventListener('click', () => {
        const areaRegistro = document.getElementById('area-registrar-gasto');
        const inputMonto = document.getElementById('input-monto');
        
        if (areaRegistro) {
            areaRegistro.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Aguarda a rolagem para aplicar o foco e abrir o teclado
            setTimeout(() => {
                inputMonto.focus();
            }, 300);
        }
    });
}

// --- LÓGICA SWIPE-TO-ACTION UNIVERSAL (Tátil + Mouse) ---
const listaHistorial = document.getElementById('lista-historial');
let startX = 0;
let startY = 0;
let activeItem = null;
let initialTranslateX = 0;
let isSwiping = false;
const MAX_SWIPE = -110;
const SWIPE_THRESHOLD = -40;

listaHistorial.addEventListener('pointerdown', (e) => {
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

    initialTranslateX = activeItem.dataset.open === "true" ? MAX_SWIPE : 0;

    activeItem.classList.add('no-transition');
    activeItem.setPointerCapture(e.pointerId);
});

listaHistorial.addEventListener('pointermove', (e) => {
    if (!activeItem) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (!isSwiping && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
        activeItem.releasePointerCapture(e.pointerId);
        activeItem.classList.remove('no-transition');
        activeItem = null;
        return;
    }

    if (Math.abs(deltaX) > 5) {
        isSwiping = true;
    }

    if (isSwiping) {
        let translateX = initialTranslateX + deltaX;
        translateX = Math.max(MAX_SWIPE, Math.min(0, translateX));
        activeItem.style.transform = `translateX(${translateX}px)`;
    }
});

listaHistorial.addEventListener('pointerup', (e) => {
    if (!activeItem) return;

    activeItem.classList.remove('no-transition');
    activeItem.releasePointerCapture(e.pointerId);

    if (isSwiping) {
        const transformStr = activeItem.style.transform;
        const match = transformStr.match(/translateX\(([-0-9.]+)px\)/);
        const currentTranslateX = match ? parseFloat(match[1]) : 0;

        if (currentTranslateX < SWIPE_THRESHOLD) {
            activeItem.style.transform = `translateX(${MAX_SWIPE}px)`;
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
            activeItem.style.transform = `translateX(${MAX_SWIPE}px)`;
            activeItem.dataset.open = "true";
        }
    }
});

listaHistorial.addEventListener('click', (e) => {
    const btnDelete = e.target.closest('.delete-btn');
    const btnEdit = e.target.closest('.edit-btn');

    if (activeItem && (btnDelete || btnEdit)) {
        activeItem.style.transform = `translateX(0px)`;
        activeItem.dataset.open = "false";
        activeItem = null;
    }

    if (btnDelete) {
        const id = parseInt(btnDelete.getAttribute('data-id'), 10);
        state.historialGlobal = state.historialGlobal.filter(g => g.id !== id);
        if (gastoEnEdicion === id) resetFormularioGasto(setGastoEnEdicion);
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        guardarYMostrar();
        showToast("🗑️ Eliminado");
    } else if (btnEdit) {
        const id = parseInt(btnEdit.getAttribute('data-id'), 10);
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
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.error('SW Registration Failed: ', err);
        });
    });
}