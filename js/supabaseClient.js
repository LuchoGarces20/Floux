// js/supabaseClient.js

// COLOQUE SUAS CHAVES AQUI
const SUPABASE_URL = 'https://bccbzuvnbgkiznstdbwv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JjJNLgwejrFFdx24Sm2WMw_jnxFHTzS';

export const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export async function getUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signUpWithEmail(email, password) {
  if (!supabase) throw new Error("Supabase não inicializado.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error("Supabase não inicializado.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Sincroniza o estado local do IndexedDB para a nuvem
export async function pushLocalStateToSupabase(state) {
  const user = await getUser();
  if (!user) return;

  const userId = user.id;

  await supabase.from('profiles').upsert({
    id: userId,
    presupuesto_mensual: state.presupuestoMensual,
    moneda_actual: state.monedaActual,
    cierre_tc: state.cierreTC,
    privacy_mode: state.privacyMode,
    categorias_custom: state.categoriasCustom,
    updated_at: new Date().toISOString()
  });

  if (state.cuentas.length > 0) {
    const cuentasPayload = state.cuentas.map(c => ({
      id: c.id, user_id: userId, nombre: c.nombre, tipo: c.tipo, cierre_tc: c.cierreTC
    }));
    await supabase.from('cuentas').upsert(cuentasPayload);
  }

  if (state.boletos.length > 0) {
    const boletosPayload = state.boletos.map(b => ({
      id: b.id, user_id: userId, description: b.desc, monto: b.monto, dia_vencimiento: b.diaVencimiento, categoria: b.categoria
    }));
    await supabase.from('boletos').upsert(boletosPayload);
  }

  if (state.historialGlobal.length > 0) {
    const gastosPayload = state.historialGlobal.map(g => ({
      id: g.id, user_id: userId, monto: g.monto, description: g.desc, fecha: g.fecha, categoria: g.categoria, mes_efectivo: g.mesEfectivo || null, cuenta_id: g.cuentaId || null, boleto_id: g.boletoId || null
    }));
    await supabase.from('gastos').upsert(gastosPayload);
  }

  if (state.historialPatrimonio.length > 0) {
    const patrimonioPayload = state.historialPatrimonio.map(p => ({
      id: p.id, user_id: userId, cuenta_id: p.cuentaId, monto: p.monto, fecha: p.fecha
    }));
    await supabase.from('patrimonio_historial').upsert(patrimonioPayload);
  }
}

// Baixa dados da nuvem para o estado local
export async function pullSupabaseToLocalState() {
  const user = await getUser();
  if (!user) return null;

  const [
    { data: profile }, { data: cuentas }, { data: boletos }, { data: gastos }, { data: patrimonio }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('cuentas').select('*').eq('user_id', user.id),
    supabase.from('boletos').select('*').eq('user_id', user.id),
    supabase.from('gastos').select('*').eq('user_id', user.id),
    supabase.from('patrimonio_historial').select('*').eq('user_id', user.id)
  ]);

  if (!profile) return null;

  return {
    presupuestoMensual: profile.presupuesto_mensual || 0,
    monedaActual: profile.moneda_actual || 'BRL',
    cierreTC: profile.cierre_tc || 24,
    privacyMode: profile.privacy_mode || false,
    categoriasCustom: profile.categorias_custom || [],
    cuentas: (cuentas || []).map(c => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, cierreTC: c.cierre_tc })),
    boletos: (boletos || []).map(b => ({ id: b.id, desc: b.description, monto: b.monto, diaVencimiento: b.dia_vencimiento, categoria: b.categoria })),
    historialGlobal: (gastos || []).map(g => ({ id: g.id, monto: g.monto, desc: g.description, fecha: g.fecha, categoria: g.categoria, mesEfectivo: g.mes_efectivo, cuentaId: g.cuenta_id, boletoId: g.boleto_id })),
    historialPatrimonio: (patrimonio || []).map(p => ({ id: p.id, cuentaId: p.cuenta_id, monto: p.monto, fecha: p.fecha }))
  };
}