import { pushExpenseToSupabase, pushMultipleExpensesToSupabase, deleteExpenseFromSupabase,
    deleteMultipleExpensesFromSupabase, pushPatrimonioToSupabase, deletePatrimonioFromSupabase,
    pushProfileToSupabase, pushCuentaToSupabase, deleteCuentaFromSupabase,
    pushBoletoToSupabase, deleteBoletoFromSupabase, eraseMyDataFromSupabase, createExpensesOnceInSupabase, profileFields, mapProfile, mapMonthlyBudget, currentMonthKey } from './supabaseClient.js';

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

// As chaves antigas e o FlouxDB original NÃO são migrados, apagados ou atribuídos a um login.
const emptyState = () => ({ presupuestoMensual: 0, historialGlobal: [], monedaActual: 'BRL',
    categoriasCustom: [], privacyMode: false, cierreTC: 24, cuentas: [], boletos: [], historialPatrimonio: [], monthlyBudgets: [], onboardingCompleted: false });
const rawState = emptyState();
export function hasUserData() {
    const blank = emptyState();
    return Object.keys(blank).some(key => Array.isArray(blank[key])
        ? rawState[key].length > 0 : rawState[key] !== blank[key]);
}
const listeners = new Set();
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const state = new Proxy(rawState, {
    set(target, property, value) {
        if (target[property] === value) return true;
        target[property] = value;
        listeners.forEach(fn => fn(property, value));
        return true;
    }
});
let ownerId = null;
let generation = 0;
let ready = false;
let cacheWriteBlocked = false;
let queue = Promise.resolve();
let latestNumericId = 0;
export const getStoreUserId = () => ownerId;
export const isStoreReady = () => ready && Boolean(ownerId);
export function resetSession(userId = null) {
    generation++;
    ownerId = userId;
    ready = false;
    cacheWriteBlocked = false;
    queue = Promise.resolve();
    Object.assign(rawState, emptyState());
}
export function markStoreReady(userId) {
    if (ownerId !== userId) throw new Error('A sessão mudou.');
    ready = true;
}
function sameSession(userId, token) {
    if (ownerId !== userId || generation !== token) throw new Error('A sessão mudou. A operação anterior foi interrompida.');
}

const DB_NAME = 'FlouxUserCache_v2';
const STORE_NAME = 'user_snapshots';
let dbPromise;
function getDB() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => { db.close(); dbPromise = null; };
            resolve(db);
        };
        request.onerror = () => { dbPromise = null; reject(request.error); };
        request.onblocked = () => { dbPromise = null; reject(new Error('Feche outras abas do Floux e tente novamente.')); };
    });
    return dbPromise;
}
async function readCache(userId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(userId);
        let value;
        req.onsuccess = () => { value = req.result; };
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error || req.error || new Error('Falha ao ler a cópia local.'));
        tx.onabort = () => reject(tx.error || new Error('Leitura local interrompida.'));
    });
}
function snapshot() {
    return structuredClone({ ...rawState });
}
export async function saveStore() {
    if (!ownerId) return;
    if (cacheWriteBlocked) throw new Error('A cópia local incompatível foi preservada. A gravação local está bloqueada para não sobrescrevê-la.');
    const userId = ownerId;
    const token = generation;
    const record = { version: 3, ownerId: userId, savedAt: new Date().toISOString(), state: snapshot() };
    assertSnapshot(record.state);
    const db = await getDB();
    sameSession(userId, token);
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record, userId);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('Não foi possível gravar a cópia local.'));
        tx.onabort = () => reject(tx.error || new Error('Salvamento local interrompido.'));
    });
}
export async function clearCurrentUserCache() {
    const userId = ownerId;
    const token = generation;
    if (!userId) return;
    const db = await getDB();
    sameSession(userId, token);
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(userId);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('Falha ao limpar esta cópia local.'));
        tx.onabort = () => reject(tx.error || new Error('Operação local interrompida.'));
    });
}
export async function loadStore(userId) {
    if (typeof userId !== 'string' || !userId) throw new Error('Usuário obrigatório para carregar dados locais.');
    resetSession(userId);
    const token = generation;
    const record = await readCache(userId);
    sameSession(userId, token);
    if (!record) return false;
    try {
        if (record.ownerId !== userId || ![2,3].includes(record.version)) throw new Error('Cópia local incompatível. Ela foi preservada sem ser carregada.');
        if (record.version === 2) record.state = { ...emptyState(), ...record.state };
        assertSnapshot(record.state);
    } catch (error) {
        // Antes de substituir um cache incompatível, guardar seus bytes em outra chave.
        cacheWriteBlocked = true;
        try {
            const db = await getDB();
            sameSession(userId, token);
            await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(record, ['recovery', userId, new Date().toISOString()]);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error || new Error('Falha ao preservar a cópia.'));
                tx.onabort = () => reject(tx.error || new Error('Preservação interrompida.'));
            });
            sameSession(userId, token);
            cacheWriteBlocked = false;
        } catch { /* Sem arquivo de recuperação confirmado, nunca sobrescrever a origem. */ }
        throw error;
    }
    Object.assign(rawState, structuredClone(record.state));
    return true;
}
export function applyRemoteSnapshot(remoteData, userId) {
    if (ownerId !== userId || ready) throw new Error('Não é seguro substituir dados enquanto a sessão está em uso.');
    assertSnapshot(remoteData);
    Object.assign(rawState, structuredClone(remoteData));
}

const validId = id => (typeof id === 'string' && id.length > 0) || (Number.isSafeInteger(id) && id >= 0);
const cents = value => Number.isSafeInteger(value) && value >= 0;
const date = value => typeof value === 'string' && Number.isFinite(new Date(value).getTime());
const unique = rows => new Set(rows.map(row => String(row.id))).size === rows.length;
export function isValidoHistorialSchema(rows) {
    return Array.isArray(rows) && rows.every(g => g && validId(g.id) && cents(g.monto) &&
        typeof g.desc === 'string' && date(g.fecha) && typeof g.categoria === 'string' &&
        (!g.mesEfectivo || /^\d{4}-(0[1-9]|1[0-2])$/.test(g.mesEfectivo))) && unique(rows);
}
function assertSnapshot(s) {
    if (!s || typeof s.onboardingCompleted !== 'boolean' || !Array.isArray(s.monthlyBudgets) ||
        !s.monthlyBudgets.every(b => b && /^\d{4}-(0[1-9]|1[0-2])$/.test(b.month) && cents(b.amount) &&
            ['BRL','USD','EUR','CLP','ARS','MXN','COP','GBP','PEN'].includes(b.currency) && Number.isSafeInteger(b.version) && b.version > 0) ||
        new Set(s.monthlyBudgets.map(b => b.month)).size !== s.monthlyBudgets.length || !cents(s.presupuestoMensual) || !isValidoHistorialSchema(s.historialGlobal) ||
        !['BRL','USD','EUR','CLP','ARS','MXN','COP','GBP','PEN'].includes(s.monedaActual) ||
        typeof s.privacyMode !== 'boolean' || !Number.isInteger(s.cierreTC) || s.cierreTC < 1 || s.cierreTC > 31 ||
        !Array.isArray(s.categoriasCustom) || !s.categoriasCustom.every(c => c && validId(c.id) && typeof c.nombre === 'string' && typeof c.emoji === 'string') ||
        !Array.isArray(s.cuentas) || !s.cuentas.every(c => c && validId(c.id) && typeof c.nombre === 'string' && typeof c.tipo === 'string' &&
            (c.cierreTC == null || (Number.isInteger(c.cierreTC) && c.cierreTC >= 1 && c.cierreTC <= 31)) && 
            (c.inactiva === undefined || typeof c.inactiva === 'boolean')) || !unique(s.cuentas) ||
        !Array.isArray(s.boletos) || !s.boletos.every(b => b && validId(b.id) && typeof b.desc === 'string' && cents(b.monto) && typeof b.categoria === 'string' &&
            Number.isInteger(b.diaVencimiento) && b.diaVencimiento >= 1 && b.diaVencimiento <= 31) || !unique(s.boletos) ||
        !Array.isArray(s.historialPatrimonio) || !s.historialPatrimonio.every(p => p && validId(p.id) && validId(p.cuentaId) && cents(p.monto) && date(p.fecha)) || !unique(s.historialPatrimonio)) {
        throw new Error('Dados incompletos ou incompatíveis. A cópia anterior foi preservada; nenhum histórico foi substituído.');
    }
}
export function isValidBackupSchema(data) {
    if (Array.isArray(data)) return isValidoHistorialSchema(data);
    try {
        const candidate = { ...emptyState(), ...data, historialGlobal: data?.historialGlobal ?? data?.historial,
            historialPatrimonio: data?.historialPatrimonio ?? data?.patrimonio ?? [] };
        assertSnapshot(candidate);
        return true;
    } catch { return false; }
}
export function nextRecordId() {
    const historicalMax = [...state.historialGlobal, ...state.historialPatrimonio]
        .reduce((max, row) => Math.max(max, typeof row.id === 'number' ? row.id : 0), 0);
    latestNumericId = Math.max(Date.now(), latestNumericId + 1, historicalMax + 1);
    return latestNumericId;
}

// Mutações serializadas e confirmadas: nenhum rollback de uma fotografia antiga.
function mutate(action) {
    const userId = ownerId;
    const token = generation;
    if (!isStoreReady()) return Promise.reject(new Error('Aguarde a sincronização antes de alterar dados.'));
    const run = async () => {
        sameSession(userId, token);
        await action(userId, () => sameSession(userId, token));
        sameSession(userId, token);
        try { await saveStore(); }
        catch (error) {
            sameSession(userId, token);
            window.dispatchEvent(new CustomEvent('floux-cache-warning', { detail: { message:
                'Alteração confirmada na nuvem, mas a cópia local não pôde ser atualizada. Mantenha a conexão e recarregue antes de usar offline.' } }));
        }
    };
    const result = queue.then(run);
    queue = result.catch(() => {});
    return result;
}
const eq = (a,b) => String(a) === String(b);
export const addExpense = expense => addMultipleExpenses([expense]);
// Criação com ID de tentativa estável: a resposta perdida pode já ter sido
// recuperada pelo pull. Reconciliar esse mesmo registro evita duplicá-lo.
export function confirmCreatedExpense(expense) {
    const item = structuredClone(expense);
    if (!isValidoHistorialSchema([item])) return Promise.reject(new Error('Despesa inválida.'));
    return mutate(async (userId, guard) => {
        await pushExpenseToSupabase(item, userId); guard();
        state.historialGlobal = [...state.historialGlobal.filter(g => !eq(g.id,item.id)), item];
    });
}
export function createExpensesOnce(draft, expenses) {
    const items = structuredClone(expenses);
    if (!isValidoHistorialSchema(items)) return Promise.reject(new Error('Despesa inválida.'));
    return mutate(async (userId, guard) => {
        if (draft.ownerId !== userId) throw new Error('A sessão mudou.');
        const receipt = await createExpensesOnceInSupabase(draft.operationId, items, userId); guard();
        if (!isValidoHistorialSchema(receipt.expenses)) throw new Error('Resposta de despesa inválida.');
        const ids = new Set(items.map(g => String(g.id)));
        if (receipt.expenses.some(g => !ids.has(String(g.id)))) throw new Error('Recibo de despesa incompatível.');
        state.historialGlobal = [...state.historialGlobal.filter(g => !ids.has(String(g.id))), ...receipt.expenses];
    });
}
export function addMultipleExpenses(expenses) {
    const items = structuredClone(expenses);
    if (!isValidoHistorialSchema(items)) return Promise.reject(new Error('Despesa inválida. Confira valor e data.'));
    return mutate(async (userId, guard) => {
        if (items.some(item => state.historialGlobal.some(g => eq(g.id,item.id)))) throw new Error('Registro já existe. Atualize os dados antes de repetir.');
        await pushMultipleExpensesToSupabase(items, userId); guard();
        state.historialGlobal = [...state.historialGlobal, ...items];
    });
}
export function updateExpense(id, data) {
    const patch = structuredClone(data);
    return mutate(async (userId, guard) => {
        const original = state.historialGlobal.find(g => eq(g.id,id));
        if (!original) throw new Error('Despesa não encontrada. Atualize os dados.');
        const updated = { ...original, ...patch, id: original.id };
        if (!isValidoHistorialSchema([updated])) throw new Error('Despesa inválida.');
        await pushExpenseToSupabase(updated, userId); guard();
        state.historialGlobal = state.historialGlobal.map(g => eq(g.id,id) ? updated : g);
    });
}
export const removeExpense = id => removeMultipleExpenses([id]);
export function removeMultipleExpenses(ids) {
    const selected = [...ids];
    return mutate(async (userId, guard) => {
        await deleteMultipleExpensesFromSupabase(selected, userId); guard();
        state.historialGlobal = state.historialGlobal.filter(g => !selected.some(id => eq(id,g.id)));
    });
}
export function replaceHistory(history) {
    if (!isValidoHistorialSchema(history)) throw new Error('Histórico inválido.');
    state.historialGlobal = structuredClone(history);
}
export function addRegistroPatrimonio(registro) {
    const item = structuredClone(registro);
    return mutate(async (userId, guard) => {
        if (!validId(item.id) || !validId(item.cuentaId) || !cents(item.monto) || !date(item.fecha)) throw new Error('Saldo inválido.');
        await pushPatrimonioToSupabase(item, userId); guard();
        state.historialPatrimonio = [...state.historialPatrimonio.filter(p => !eq(p.id,item.id)), item];
    });
}
export function removeRegistroPatrimonio(id) {
    return mutate(async (userId, guard) => {
        await deletePatrimonioFromSupabase(id, userId); guard();
        state.historialPatrimonio = state.historialPatrimonio.filter(p => !eq(p.id,id));
    });
}
export function updateCuentaStatus(id, inactiva) {
    return mutate(async (userId, guard) => {
        const original = state.cuentas.find(c => eq(c.id,id));
        if (!original) return;
        const updated = { ...original, inactiva };
        await pushCuentaToSupabase(updated, userId); guard();
        state.cuentas = state.cuentas.map(c => eq(c.id,id) ? updated : c);
    });
}
export function addCuenta(cuenta) {
    const item = structuredClone(cuenta);
    return mutate(async (userId, guard) => {
        assertSnapshot({ ...snapshot(), cuentas: [...state.cuentas.filter(c => !eq(c.id,item.id)), item] });
        await pushCuentaToSupabase(item, userId); guard();
        state.cuentas = [...state.cuentas.filter(c => !eq(c.id,item.id)), item];
    });
}
export function removeCuenta(id) {
    return mutate(async (userId, guard) => {
        await deleteCuentaFromSupabase(id, userId); guard();
        state.cuentas = state.cuentas.filter(c => !eq(c.id,id));
    });
}
export function addBoleto(boleto) {
    const item = structuredClone(boleto);
    return mutate(async (userId, guard) => {
        assertSnapshot({ ...snapshot(), boletos: [...state.boletos.filter(b => !eq(b.id,item.id)), item] });
        await pushBoletoToSupabase(item, userId); guard();
        state.boletos = [...state.boletos.filter(b => !eq(b.id,item.id)), item];
    });
}
export function removeBoleto(id) {
    return mutate(async (userId, guard) => {
        await deleteBoletoFromSupabase(id, userId); guard();
        state.boletos = state.boletos.filter(b => !eq(b.id,id));
    });
}
export function updateProfile(patch) {
    const changes = structuredClone(patch);
    return mutate(async (userId, guard) => {
        const updated = { ...snapshot(), ...changes };
        assertSnapshot(updated);
        const patch = {}, expected = {};
        for (const key of Object.keys(changes)) {
            if (!profileFields[key]) throw new Error('Campo de perfil inválido.');
            patch[profileFields[key]] = changes[key];
            expected[profileFields[key]] = rawState[key];
        }
        const month = currentMonthKey();
        const monthly = state.monthlyBudgets.find(b => b.month === month);
        const result = await pushProfileToSupabase(patch, expected, month,
            'presupuestoMensual' in changes ? monthly?.version ?? null : null, userId); guard();
        const profile = mapProfile(result.profile);
        const budgets = result.monthly_budget
            ? [...state.monthlyBudgets.filter(b => b.month !== result.monthly_budget.month), mapMonthlyBudget(result.monthly_budget)]
            : state.monthlyBudgets;
        assertSnapshot({ ...snapshot(), ...profile, monthlyBudgets: budgets });
        // Publish the snapshot together, then notify once to avoid intermediate stale UI.
        Object.assign(rawState, profile, { monthlyBudgets: budgets });
        listeners.forEach(fn => fn('profile', profile));
    });
}
export const syncProfileToSupabase = () => updateProfile({});

export function eraseUserData(operationId) {
    return mutate(async (userId, guard) => {
        await eraseMyDataFromSupabase(operationId, userId);
        guard();
        // Nunca esvaziar o estado antes de a transação da nuvem confirmar.
        for (const [key, value] of Object.entries(emptyState())) state[key] = value;
    });
}