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
export const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

export const state = new Proxy(rawState, {
    set(target, property, value) {
        if (target[property] === value) return true;
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
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
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
    if (Array.isArray(c)) rawState.categoriasCustom = c;
    if (cierre !== undefined) rawState.cierreTC = cierre;
    
    if (Array.isArray(cuentas) && cuentas.length > 0) {
        rawState.cuentas = cuentas;
    } else {
        rawState.cuentas = [{ id: 'acc_default', nombre: 'Conta Principal', tipo: 'cash', cierreTC: null }];
    }
    
    if (Array.isArray(boletos)) rawState.boletos = boletos;
    if (Array.isArray(pat)) rawState.historialPatrimonio = pat;
    if (p !== undefined) {
        rawState.presupuestoMensual = p;
        if (isValidoHistorialSchema(h)) rawState.historialGlobal = h;
        return true;
    }
    return false;
}

/**
 * SALVAMENTO ATÔMICO EM UMA ÚNICA TRANSAÇÃO READWRITE
 * Previne Race Conditions e Corrupção parcial no IndexedDB
 */
export async function saveStore() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        store.put(state.presupuestoMensual, STORAGE_KEYS.PRESUPUESTO);
        store.put(state.historialGlobal, STORAGE_KEYS.HISTORIAL);
        store.put(state.monedaActual, STORAGE_KEYS.MONEDA);
        store.put(state.categoriasCustom, STORAGE_KEYS.CATEGORIAS);
        store.put(state.privacyMode, STORAGE_KEYS.PRIVACY);
        store.put(state.cierreTC, STORAGE_KEYS.CIERRE_TC);
        store.put(state.cuentas, STORAGE_KEYS.CUENTAS);
        store.put(state.boletos, STORAGE_KEYS.BOLETOS);
        store.put(state.historialPatrimonio, STORAGE_KEYS.PATRIMONIO);

        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
        tx.onabort = (e) => reject(e.target.error || new Error('Transação abortada'));
    });
}

async function migrateFromLocalStorage() {
    try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        const rawPresupuesto = localStorage.getItem(STORAGE_KEYS.PRESUPUESTO);
        const rawHistorial = localStorage.getItem(STORAGE_KEYS.HISTORIAL);
        
        if (rawPresupuesto) store.put(parseInt(rawPresupuesto, 10) || 0, STORAGE_KEYS.PRESUPUESTO);
        if (rawHistorial) {
            const parsedHistorial = JSON.parse(rawHistorial);
            if (Array.isArray(parsedHistorial)) store.put(parsedHistorial, STORAGE_KEYS.HISTORIAL);
        }
        
        await new Promise((resolve) => { tx.oncomplete = resolve; });
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    } catch (e) {
        console.error("Falha na migração do LocalStorage. Resetando chaves corrompidas.", e);
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    }
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

export function isValidBackupSchema(data) {
    if (!data || typeof data !== 'object') return false;
    const history = Array.isArray(data) ? data : data.historial;
    if (!isValidoHistorialSchema(history)) return false;

    if (!Array.isArray(data)) {
        if (data.cuentas && !Array.isArray(data.cuentas)) return false;
        if (data.boletos && !Array.isArray(data.boletos)) return false;
        if (data.patrimonio && !Array.isArray(data.patrimonio)) return false;
    }
    return true;
}

export function addExpense(expense) { state.historialGlobal = [...state.historialGlobal, expense]; }
export function addMultipleExpenses(expensesArray) { state.historialGlobal = [...state.historialGlobal, ...expensesArray]; }
export function updateExpense(id, updatedData) { state.historialGlobal = state.historialGlobal.map(g => g.id === id ? { ...g, ...updatedData } : g); }
export function removeExpense(id) { state.historialGlobal = state.historialGlobal.filter(g => g.id !== id); }
export function replaceHistory(newHistory) { state.historialGlobal = newHistory; }
export function addRegistroPatrimonio(registro) { state.historialPatrimonio = [...state.historialPatrimonio, registro]; }