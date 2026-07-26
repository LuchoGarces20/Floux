export const STORAGE_KEYS = {
    PRESUPUESTO: 'floux_presupuesto_v8',
    HISTORIAL: 'floux_historial_v8',
    MONEDA: 'floux_moneda',
    CATEGORIAS: 'floux_categorias_custom',
    MES_GUARDADO: 'floux_mes_guardado',
    LANG: 'floux_lang',
    PRIVACY: 'floux_privacy',
    CIERRE_TC: 'floux_cierre_tc',
    CUENTAS: 'floux_cuentas_v1',
    BOLETOS: 'floux_boletos_v1',
    PATRIMONIO: 'floux_patrimonio_v1'
};

const rawState = {
    presupuestoMensual: 0,
    historialGlobal: [],
    monedaActual: 'BRL',
    categoriasCustom: [],
    privacyMode: false,
    cierreTC: 24,
    cuentas: [],
    boletos: [],
    historialPatrimonio: []
};

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);

export const state = new Proxy(rawState, {
    set(target, property, value) {
        target[property] = value;
        listeners.forEach(fn => fn(property, value));
        return true;
    }
});

const DB_NAME = 'FlouxDB';
const STORE_NAME = 'floux_store';

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = e => {
            e.target.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbPut(key, value) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e.target.error);
    });
}

export async function loadStore() {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    if (localStorage.getItem(STORAGE_KEYS.PRESUPUESTO) !== null) await migrateFromLocalStorage();
    
    const priv = await dbGet(STORAGE_KEYS.PRIVACY);
    const m = await dbGet(STORAGE_KEYS.MONEDA);
    const c = await dbGet(STORAGE_KEYS.CATEGORIAS);
    const p = await dbGet(STORAGE_KEYS.PRESUPUESTO);
    const h = await dbGet(STORAGE_KEYS.HISTORIAL);
    const cierre = await dbGet(STORAGE_KEYS.CIERRE_TC);
    const cuentas = await dbGet(STORAGE_KEYS.CUENTAS);
    const boletos = await dbGet(STORAGE_KEYS.BOLETOS);
    const pat = await dbGet(STORAGE_KEYS.PATRIMONIO);

    if (priv === true) rawState.privacyMode = true;
    if (m) rawState.monedaActual = m;
    if (c) rawState.categoriasCustom = c;
    if (cierre !== undefined) rawState.cierreTC = cierre;
    
    if (cuentas && cuentas.length > 0) {
        rawState.cuentas = cuentas;
    } else {
        rawState.cuentas = [{ id: 'acc_default', nombre: 'Conta Principal', tipo: 'cash', cierreTC: null }];
    }
    
    if (boletos) rawState.boletos = boletos;
    if (pat) rawState.historialPatrimonio = pat;

    if (p !== undefined) {
        rawState.presupuestoMensual = p;
        if (isValidoHistorialSchema(h)) rawState.historialGlobal = h;
        return true; 
    }
    return false;
}

export async function saveStore() {
    await dbPut(STORAGE_KEYS.PRESUPUESTO, state.presupuestoMensual);
    await dbPut(STORAGE_KEYS.HISTORIAL, state.historialGlobal);
    await dbPut(STORAGE_KEYS.MONEDA, state.monedaActual);
    await dbPut(STORAGE_KEYS.CATEGORIAS, state.categoriasCustom);
    await dbPut(STORAGE_KEYS.PRIVACY, state.privacyMode);
    await dbPut(STORAGE_KEYS.CIERRE_TC, state.cierreTC);
    await dbPut(STORAGE_KEYS.CUENTAS, state.cuentas);
    await dbPut(STORAGE_KEYS.BOLETOS, state.boletos);
    await dbPut(STORAGE_KEYS.PATRIMONIO, state.historialPatrimonio);
}

async function migrateFromLocalStorage() {
    await dbPut(STORAGE_KEYS.PRESUPUESTO, parseInt(localStorage.getItem(STORAGE_KEYS.PRESUPUESTO), 10));
    await dbPut(STORAGE_KEYS.HISTORIAL, JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORIAL) || '[]'));
    await dbPut(STORAGE_KEYS.MONEDA, localStorage.getItem(STORAGE_KEYS.MONEDA));
    await dbPut(STORAGE_KEYS.CATEGORIAS, JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIAS) || '[]'));
    await dbPut(STORAGE_KEYS.PRIVACY, localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
    const cierreLocal = localStorage.getItem(STORAGE_KEYS.CIERRE_TC);
    await dbPut(STORAGE_KEYS.CIERRE_TC, cierreLocal !== null ? parseInt(cierreLocal, 10) : 24);
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}

export function isValidoHistorialSchema(data) {
    if (!Array.isArray(data)) return false;
    return data.every(item => 
        typeof item === 'object' && item !== null &&
        typeof item.id === 'number' && typeof item.monto === 'number' &&
        typeof item.desc === 'string' && typeof item.fecha === 'string' &&
        typeof item.categoria === 'string'
    );
}

export function addExpense(expense) { state.historialGlobal = [...state.historialGlobal, expense]; }
export function addMultipleExpenses(expensesArray) { state.historialGlobal = [...state.historialGlobal, ...expensesArray]; }
export function updateExpense(id, updatedData) {
    state.historialGlobal = state.historialGlobal.map(g => g.id === id ? { ...g, ...updatedData } : g);
}
export function removeExpense(id) { state.historialGlobal = state.historialGlobal.filter(g => g.id !== id); }
export function replaceHistory(newHistory) { state.historialGlobal = newHistory; }

export function addRegistroPatrimonio(registro) {
    state.historialPatrimonio = [...state.historialPatrimonio, registro];
}