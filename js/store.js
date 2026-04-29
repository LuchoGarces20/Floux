export const STORAGE_KEYS = {
    PRESUPUESTO: 'floux_presupuesto_v8',
    HISTORIAL: 'floux_historial_v8',
    MONEDA: 'floux_moneda',
    CATEGORIAS: 'floux_categorias_custom',
    MES_GUARDADO: 'floux_mes_guardado',
    LANG: 'floux_lang',
    PRIVACY: 'floux_privacy' 
};

export const state = {
    presupuestoMensual: 0,
    historialGlobal: [],
    monedaActual: 'BRL',
    categoriasCustom: [],
    privacyMode: false
};

export function loadStore() {
    const p = localStorage.getItem(STORAGE_KEYS.PRESUPUESTO);
    const h = localStorage.getItem(STORAGE_KEYS.HISTORIAL);
    const m = localStorage.getItem(STORAGE_KEYS.MONEDA);
    const c = localStorage.getItem(STORAGE_KEYS.CATEGORIAS);
    const priv = localStorage.getItem(STORAGE_KEYS.PRIVACY);
    
    if (priv === 'true') state.privacyMode = true;
    if (m) state.monedaActual = m;
    
    if (c) {
        try { state.categoriasCustom = JSON.parse(c) || []; }
        catch (e) { console.error("Failed to parse custom categories."); }
    }
    
    if (p) {
        state.presupuestoMensual = parseInt(p, 10);
        try {
            const parsedHistorial = JSON.parse(h);
            if (isValidoHistorialSchema(parsedHistorial)) {
                state.historialGlobal = parsedHistorial;
            }
        } catch (e) {
            console.error("Failed to parse history data.");
        }
        return true; 
    }
    return false;
}

export function saveStore() {
    localStorage.setItem(STORAGE_KEYS.PRESUPUESTO, state.presupuestoMensual);
    localStorage.setItem(STORAGE_KEYS.HISTORIAL, JSON.stringify(state.historialGlobal));
    localStorage.setItem(STORAGE_KEYS.MONEDA, state.monedaActual);
    localStorage.setItem(STORAGE_KEYS.CATEGORIAS, JSON.stringify(state.categoriasCustom));
    localStorage.setItem(STORAGE_KEYS.PRIVACY, state.privacyMode);
}

export function isValidoHistorialSchema(data) {
    if (!Array.isArray(data)) return false;
    return data.every(item => 
        typeof item === 'object' && item !== null &&
        typeof item.id === 'number' &&
        typeof item.monto === 'number' &&
        typeof item.desc === 'string' &&
        typeof item.fecha === 'string' &&
        typeof item.categoria === 'string'
    );
}