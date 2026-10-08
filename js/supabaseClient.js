// js/supabaseClient.js
const SUPABASE_URL = 'https://bccbzuvnbgkiznstdbwv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JjJNLgwejrFFdx24Sm2WMw_jnxFHTzS';

// SDK obtido no momento do uso: evita inicializar como null antes do script da CDN.
let client = null;
export function getSupabaseClient() {
    if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!client) throw new Error('Serviço indisponível. Verifique a conexão e recarregue o app.');
    return client;
}

const TIMEOUT_MS = 20000;
async function authRequest(operation) {
    let timer;
    try {
        return await Promise.race([
            operation(),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tempo de conexão esgotado. Tente novamente quando estiver conectado.')), TIMEOUT_MS); })
        ]);
    } finally { clearTimeout(timer); }
}

export async function getUser() {
    const result = await authRequest(() => getSupabaseClient().auth.getUser());
    // Ausência normal de sessão não é indisponibilidade do servidor.
    if (result.error && result.error.name !== 'AuthSessionMissingError') throw result.error;
    return result.data?.user || null;
}

async function requireUser(expectedUserId) {
    const user = await getUser();
    if (!user || (expectedUserId && user.id !== expectedUserId)) {
        throw new Error('A sessão mudou. Entre novamente antes de salvar.');
    }
    if (navigator.onLine === false) throw new Error('Sem conexão. Nenhuma alteração foi confirmada.');
    return user;
}

export async function signUpWithEmail(email, password) {
    const result = await authRequest(() => getSupabaseClient().auth.signUp({ email, password }));
    if (result.error) throw result.error;
    return result.data;
}
export async function signInWithEmail(email, password) {
    const result = await authRequest(() => getSupabaseClient().auth.signInWithPassword({ email, password }));
    if (result.error) throw result.error;
    return result.data;
}
export async function signOutUser() {
    const result = await authRequest(() => getSupabaseClient().auth.signOut());
    if (result.error) throw result.error;
}
export function onAuthChange(callback) {
    const { data } = getSupabaseClient().auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
}

async function executeQuery(query, controller) {
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const result = await query.abortSignal(controller.signal);
        if (result.error) {
            const error = new Error('Não foi possível confirmar a operação na nuvem. Verifique a conexão e as permissões da conta.');
            error.code = result.error.code || 'REMOTE_ERROR';
            if (error.code === 'FLX01') error.message = 'Este campo mudou em outro dispositivo. Atualize os dados antes de salvar novamente.';
            if (error.code === 'FLX03') error.message = 'Tentativa cancelada. Inicie uma nova despesa.';
            if (error.code === 'FLX02') error.message = 'A tentativa anterior tem outros dados. Resolva-a antes de iniciar outra despesa.';
            if (['42883','PGRST202'].includes(error.code)) error.message = 'Atualização do banco necessária. Execute o script Supabase fornecido antes de usar esta versão.';
            throw error;
        }
        return result;
    } catch (error) {
        if (controller.signal.aborted) {
            const timeout = new Error('Não foi possível confirmar a resposta. Reconecte e atualize os dados antes de repetir a operação.');
            timeout.code = 'CONFIRMATION_TIMEOUT';
            throw timeout;
        }
        throw error;
    } finally { clearTimeout(timer); }
}

async function upsertRows(table, rows, expectedUserId) {
    const user = await requireUser(expectedUserId);
    const payload = rows.map(row => table === 'profiles' ? { ...row, id: user.id } : { ...row, user_id: user.id });
    if (!payload.length) return;
    const result = await executeQuery(getSupabaseClient().from(table).upsert(payload).select('id'), new AbortController());
    const returnedIds = new Set((result.data || []).map(row => String(row.id)));
    if (payload.some(row => !returnedIds.has(String(row.id)))) {
        throw new Error('A nuvem não confirmou todos os registros. Atualize os dados antes de repetir.');
    }
}
async function deleteRows(table, ids, expectedUserId) {
    const user = await requireUser(expectedUserId);
    if (!ids.length) return;
    const result = await executeQuery(getSupabaseClient().from(table).delete().in('id', ids).eq('user_id', user.id).select('id'), new AbortController());
    const removedIds = new Set((result.data || []).map(row => String(row.id)));
    if (ids.some(id => !removedIds.has(String(id)))) {
        throw new Error('Algum registro não foi removido ou já mudou em outro dispositivo. Atualize os dados antes de tentar novamente.');
    }
}
function expensePayload(g) {
    return { id: g.id, monto: g.monto, description: g.desc, fecha: g.fecha, categoria: g.categoria,
        mes_efectivo: g.mesEfectivo || null, cuenta_id: g.cuentaId || null,
        boleto_id: g.boletoId || null, group_id: g.groupId || null };
}
export const pushExpenseToSupabase = (g, userId) => upsertRows('gastos', [expensePayload(g)], userId);
export const pushMultipleExpensesToSupabase = (rows, userId) => upsertRows('gastos', rows.map(expensePayload), userId);
export const deleteExpenseFromSupabase = (id, userId) => deleteRows('gastos', [id], userId);
export const deleteMultipleExpensesFromSupabase = (ids, userId) => deleteRows('gastos', ids, userId);
export const pushCuentaToSupabase = (c, userId) => upsertRows('cuentas', [{ id: c.id, nombre: c.nombre, tipo: c.tipo, cierre_tc: c.cierreTC, inactiva: c.inactiva || false }], userId);
export const deleteCuentaFromSupabase = (id, userId) => deleteRows('cuentas', [id], userId);
export const pushBoletoToSupabase = (b, userId) => upsertRows('boletos', [{ id: b.id, description: b.desc, monto: b.monto, dia_vencimiento: b.diaVencimiento, categoria: b.categoria }], userId);
export const deleteBoletoFromSupabase = (id, userId) => deleteRows('boletos', [id], userId);
export const pushPatrimonioToSupabase = (p, userId) => upsertRows('patrimonio_historial', [{ id: p.id, cuenta_id: p.cuentaId, monto: p.monto, fecha: p.fecha }], userId);
export const deletePatrimonioFromSupabase = (id, userId) => deleteRows('patrimonio_historial', [id], userId);
export const profileFields = { presupuestoMensual: 'presupuesto_mensual', monedaActual: 'moneda_actual',
    cierreTC: 'cierre_tc', privacyMode: 'privacy_mode', categoriasCustom: 'categorias_custom',
    onboardingCompleted: 'onboarding_completed' };
export function mapProfile(p) {
    return { presupuestoMensual: p.presupuesto_mensual ?? 0, monedaActual: p.moneda_actual ?? 'BRL',
        cierreTC: p.cierre_tc ?? 24, privacyMode: p.privacy_mode ?? false,
        categoriasCustom: p.categorias_custom ?? [], onboardingCompleted: p.onboarding_completed === true };
}
export const mapMonthlyBudget = b => ({ month: b.month, amount: b.budget, currency: b.currency, version: b.version });
export const mapExpense = g => ({ id: g.id, monto: g.monto, desc: g.description, fecha: g.fecha,
    categoria: g.categoria, mesEfectivo: g.mes_efectivo, cuentaId: g.cuenta_id, boletoId: g.boleto_id, groupId: g.group_id, createdAt: g.created_at });
export function currentMonthKey(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
}
export async function pushProfileToSupabase(patch, expected, budgetMonth, budgetVersion, expectedUserId) {
    const user = await requireUser(expectedUserId);
    const result = await executeQuery(getSupabaseClient().rpc('floux_patch_profile', {
        p_patch: patch, p_expected: expected, p_budget_month: budgetMonth,
        p_expected_budget_version: budgetVersion
    }), new AbortController());
    if (result.data?.owner_id !== user.id || result.data.profile?.id !== user.id) throw new Error('Perfil não confirmado. Atualize os dados.');
    return result.data;
}
function validateExpenseReceipt(data, userId, operationId) {
    if (data?.owner_id !== userId || data.operation_id !== operationId || !Array.isArray(data.expenses) ||
        !['created','already_processed','cancelled'].includes(data.status) || data.expenses.some(g => g.user_id !== userId)) {
        throw new Error('Recibo de despesa incompatível. Atualize os dados.');
    }
    return { ...data, expenses: data.expenses.map(mapExpense) };
}
export async function createExpensesOnceInSupabase(operationId, expenses, expectedUserId) {
    const user = await requireUser(expectedUserId);
    const result = await executeQuery(getSupabaseClient().rpc('floux_create_expenses', {
        p_operation_id: operationId, p_expenses: expenses.map(expensePayload)
    }), new AbortController());
    return validateExpenseReceipt(result.data, user.id, operationId);
}
export async function getExpenseReceiptFromSupabase(operationId, expectedUserId, resolve = false) {
    const user = await requireUser(expectedUserId);
    const result = await executeQuery(getSupabaseClient().rpc('floux_get_expense_receipt', {
        p_operation_id: operationId, p_resolve: resolve
    }), new AbortController());
    return result.data == null ? null : validateExpenseReceipt(result.data, user.id, operationId);
}
// Full-state uploads are intentionally refused: stale snapshots must not overwrite profile columns.
export async function pushLocalStateToSupabase() {
    throw new Error('Use alterações parciais confirmadas; o envio de um perfil completo não é permitido.');
}

async function readAll(table, userId, controller, orderColumn = 'id') {
    const rows = [];
    const pageSize = 500;
    let expectedCount;
    while (true) {
        const result = await executeQuery(getSupabaseClient().from(table)
            .select('*', { count: 'exact' }).eq('user_id', userId)
            .order(orderColumn, { ascending: true }).range(rows.length, rows.length + pageSize - 1), controller);
        if (!Array.isArray(result.data) || !Number.isSafeInteger(result.count) || result.count < 0) {
            throw new Error('Resposta incompleta da nuvem. Os dados locais foram preservados.');
        }
        if (expectedCount === undefined) expectedCount = result.count;
        if (expectedCount !== result.count) throw new Error('Os dados mudaram durante a leitura. Atualize novamente.');
        if (result.data.length === 0 && rows.length < expectedCount) throw new Error('Histórico incompleto. Os dados locais foram preservados.');
        rows.push(...result.data);
        if (rows.length === expectedCount) return rows;
        if (rows.length > expectedCount) throw new Error('Resposta inconsistente da nuvem.');
    }
}

export async function pullSupabaseToLocalState(expectedUserId) {
    const user = await requireUser(expectedUserId);
    const controller = new AbortController();
    try {
        const month = currentMonthKey();
        const initialized = await executeQuery(getSupabaseClient().rpc('floux_initialize_user', { p_month: month }), controller);
        if (initialized.data?.owner_id !== user.id || initialized.data.schema_version !== 1) throw new Error('Inicialização não confirmada.');
        const [profileResult, cuentas, boletos, gastos, patrimonio, monthlyBudgets] = await Promise.all([
            executeQuery(getSupabaseClient().from('profiles').select('*').eq('id', user.id).maybeSingle(), controller),
            readAll('cuentas', user.id, controller), readAll('boletos', user.id, controller),
            readAll('gastos', user.id, controller), readAll('patrimonio_historial', user.id, controller),
            readAll('monthly_budgets', user.id, controller, 'month')
        ]);
        const profile = profileResult.data;
        if (!profile) {
            if (cuentas.length || boletos.length || gastos.length || patrimonio.length) {
                throw new Error('Há registros na conta, mas o perfil não pôde ser recuperado. Nenhum dado local foi substituído.');
            }
            return null;
        }
        return { ...mapProfile(profile), monthlyBudgets: monthlyBudgets.map(mapMonthlyBudget),
            cuentas: cuentas.map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, cierreTC: c.cierre_tc, inactiva: c.inactiva || false })),
            boletos: boletos.map(b => ({ id: b.id, desc: b.description, monto: b.monto, diaVencimiento: b.dia_vencimiento, categoria: b.categoria })),
            historialGlobal: gastos.map(mapExpense),
            historialPatrimonio: patrimonio.map(p => ({ id: p.id, cuentaId: p.cuenta_id, monto: p.monto, fecha: p.fecha })) };
    } catch (error) { controller.abort(); throw error; }
}
// Uma transação do servidor, sempre vinculada ao usuário do JWT.
export async function eraseMyDataFromSupabase(operationId, expectedUserId) {
    const user = await requireUser(expectedUserId);
    if (!/^reset_[0-9]{10,20}$/.test(operationId)) throw new Error('Identificação da exclusão inválida.');
    const result = await executeQuery(getSupabaseClient().rpc('floux_erase_my_data', {
        p_operation_id: operationId
    }), new AbortController());
    if (result.data?.owner_id !== user.id || result.data?.operation_id !== operationId || result.data?.deleted !== true) {
        throw new Error('A nuvem não confirmou a exclusão. Atualize os dados antes de tentar novamente.');
    }
    return result.data;
}

// Consulta somente o recibo: nunca repete a exclusão ao abrir/recarregar o app.
export async function getEraseReceiptFromSupabase(operationId, expectedUserId) {
    const user = await requireUser(expectedUserId);
    const result = await executeQuery(getSupabaseClient().rpc('floux_get_erase_receipt', {
        p_operation_id: operationId
    }), new AbortController());
    if (result.data == null) return null;
    if (result.data.owner_id !== user.id || result.data.operation_id !== operationId || result.data.deleted !== true) {
        throw new Error('Recibo de exclusão incompatível. Atualize os dados.');
    }
    return result.data;
}