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