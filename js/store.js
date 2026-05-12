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
        req.onerror = (e) => {
            if (e.target.error && e.target.error.name === 'QuotaExceededError') {
                console.error('[Storage] QuotaExceededError: Local capacity reached.');
            }
            reject(e.target.error);
        };
    });
}

export async function loadStore() {
    if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
    }

    if (localStorage.getItem(STORAGE_KEYS.PRESUPUESTO) !== null) {
        await migrateFromLocalStorage();
    }

    const priv = await dbGet(STORAGE_KEYS.PRIVACY);
    const m = await dbGet(STORAGE_KEYS.MONEDA);
    const c = await dbGet(STORAGE_KEYS.CATEGORIAS);
    const p = await dbGet(STORAGE_KEYS.PRESUPUESTO);
    const h = await dbGet(STORAGE_KEYS.HISTORIAL);

    if (priv === true) state.privacyMode = true;
    if (m) state.monedaActual = m;
    if (c) state.categoriasCustom = c;

    if (p !== undefined) {
        state.presupuestoMensual = p;
        if (isValidoHistorialSchema(h)) {
            state.historialGlobal = h;
        }
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
}

async function migrateFromLocalStorage() {
    await dbPut(STORAGE_KEYS.PRESUPUESTO, parseInt(localStorage.getItem(STORAGE_KEYS.PRESUPUESTO), 10));
    await dbPut(STORAGE_KEYS.HISTORIAL, JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORIAL) || '[]'));
    await dbPut(STORAGE_KEYS.MONEDA, localStorage.getItem(STORAGE_KEYS.MONEDA));
    await dbPut(STORAGE_KEYS.CATEGORIAS, JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIAS) || '[]'));
    await dbPut(STORAGE_KEYS.PRIVACY, localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true');
    
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
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

export function addExpense(expense) {
    state.historialGlobal.push(expense);
}

export function updateExpense(id, updatedData) {
    const index = state.historialGlobal.findIndex(g => g.id === id);
    if (index !== -1) {
        state.historialGlobal[index] = { ...state.historialGlobal[index], ...updatedData };
    }
}

export function removeExpense(id) {
    state.historialGlobal = state.historialGlobal.filter(g => g.id !== id);
}

export function replaceHistory(newHistory) {
    state.historialGlobal = newHistory;
}