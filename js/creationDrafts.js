import { getStoreUserId, nextRecordId } from './store.js';

// Somente IDs e datas de tentativas; não guarda nomes, valores ou credenciais.
// sessionStorage conserva o ID após reload nesta aba, separado por proprietário.
const PREFIX = 'floux_creation_v1:';
const memory = new Map();
const keyFor = (userId, scope) => PREFIX + encodeURIComponent(userId) + ':' + scope;
function read(key) {
    if (memory.has(key)) return memory.get(key);
    try {
        const value = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (value) memory.set(key, value);
        return value;
    } catch { return null; }
}
function write(key, value) {
    memory.set(key, value);
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* A mesma página continua protegida. */ }
}
export function getCreationDraft(scope, prefix = '') {
    const ownerId = getStoreUserId();
    if (!ownerId) throw new Error('Entre na sua conta antes de criar registros.');
    const key = keyFor(ownerId, scope);
    const previous = read(key);
    if (previous?.ownerId === ownerId && previous.scope === scope &&
        ((typeof previous.id === 'string' && previous.id) || Number.isSafeInteger(previous.id)) &&
        Number.isFinite(new Date(previous.createdAt).getTime())) return previous;
    const number = nextRecordId();
    const draft = { ownerId, scope, id: prefix ? prefix + number : number, createdAt: new Date().toISOString() };
    write(key, draft);
    return draft;
}
export function getPendingCreation(scope) {
    const ownerId = getStoreUserId();
    if (!ownerId) return null;
    const draft = read(keyFor(ownerId, scope));
    return draft?.ownerId === ownerId && draft.scope === scope ? draft : null;
}
// Normal expenses keep a durable operation token and a hash, never form contents.
// A different form cannot silently replace an unresolved save attempt.
export async function getExpenseCreationDraft(fields, baseIso) {
    const ownerId = getStoreUserId();
    if (!ownerId) throw new Error('Entre na sua conta antes de criar registros.');
    if (!crypto.subtle || !crypto.randomUUID) throw new Error('Abra o app por HTTPS para salvar com segurança.');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fields)));
    const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (getStoreUserId() !== ownerId) throw new Error('A sessão mudou.');
    const previous = getPendingCreation('expense');
    if (previous) {
        if (previous.fingerprint !== fingerprint || previous.itemIds?.length !== fields.cuotas) {
            const error = new Error('Resolva a tentativa anterior antes de iniciar outra despesa.');
            error.code = 'PENDING_EXPENSE';
            throw error;
        }
        return previous;
    }
    const operationId = crypto.randomUUID();
    const itemIds = [];
    while (itemIds.length < fields.cuotas) {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const id = bytes.reduce((value, byte) => value * 256 + byte, 0);
        if (id > 0 && !itemIds.includes(id)) itemIds.push(id);
    }
    const draft = { ownerId, scope: 'expense', id: operationId, operationId, fingerprint,
        itemIds, groupId: 'group_' + operationId, baseIso, createdAt: new Date().toISOString() };
    const key = keyFor(ownerId, 'expense');
    // If persistence fails, do not start an operation whose retry token could be lost.
    sessionStorage.setItem(key, JSON.stringify(draft));
    memory.set(key, draft);
    return draft;
}
export function completeCreation(draft) {
    const key = keyFor(draft.ownerId, draft.scope);
    if (read(key)?.id !== draft.id) return;
    memory.set(key, null);
    try { sessionStorage.removeItem(key); } catch { /* Não interfere na confirmação da nuvem. */ }
}
export function clearCreationDrafts(userId) {
    const prefix = PREFIX + encodeURIComponent(userId) + ':';
    for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
    try {
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(prefix)) keys.push(key);
        }
        for (const key of keys) sessionStorage.removeItem(key);
    } catch { /* Não toca no armazenamento de outras contas. */ }
}