/** Pure financial rules. All monetary values are integer cents. */
export function getMonthlyBudget(state, viewMonth, viewYear, now = new Date()) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const saved = (state.monthlyBudgets || []).find(b => b.month === key);
    if (saved) return { amount: saved.amount, currency: saved.currency, known: true, estimated: false };
    const viewed = new Date(viewYear, viewMonth, 1);
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    // Never infer a past budget from today's settings. Future months are estimates.
    if (viewed > current) return { amount: state.presupuestoMensual, known: true, estimated: true };
    return { amount: null, known: false, estimated: false };
}

export function calculateBalances(state, expenses, viewMonth, viewYear, now) {
    const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();
    const monthly = getMonthlyBudget(state, viewMonth, viewYear, now);
    const variable = expenses.filter(g => !g.boletoId);
    const totalGastadoMesCents = variable.reduce((sum, g) => sum + g.monto, 0);
    const liquidezLibreCents = monthly.known ? monthly.amount - totalGastadoMesCents : null;
    let gastosHojeCents = 0;
    let diasRestantes = new Date(viewYear, viewMonth + 1, 0).getDate();
    if (isCurrentMonth) {
        diasRestantes = Math.max(1, diasRestantes - now.getDate() + 1);
        gastosHojeCents = variable.filter(g => {
            const d = new Date(g.fecha);
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear() && !g.mesEfectivo;
        }).reduce((sum, g) => sum + g.monto, 0);
    }
    const tetoDoDiaCents = monthly.known ? Math.max(0, Math.floor((liquidezLibreCents + gastosHojeCents) / diasRestantes)) : 0;
    // Cálculo da Previsão de Pouso (Landing Predictor)
    let projectedLiquidityCents = null;
    if (isCurrentMonth && monthly.known && now.getDate() > 1) {
        const diasPassados = now.getDate();
        const gastoMedioDiario = totalGastadoMesCents / diasPassados;
        const totalDiasMes = new Date(viewYear, viewMonth + 1, 0).getDate();
        projectedLiquidityCents = Math.floor(monthly.amount - (gastoMedioDiario * totalDiasMes));
    }

    return { totalGastadoMesCents, boletosPendientesCents: 0, liquidezLibreCents, gastosHojeCents,
        tetoDoDiaCents, disponivelHojeCents: isCurrentMonth ? tetoDoDiaCents - gastosHojeCents : 0,
        diasRestantes, percentualConsumido: monthly.known && monthly.amount > 0 ? totalGastadoMesCents / monthly.amount * 100 : 0,
        isExcedido: monthly.known && liquidezLibreCents < 0, hasBudget: monthly.known,
        budgetCents: monthly.amount, estimatedBudget: monthly.estimated, projectedLiquidityCents };
}

export function calculateNetWorth(state, now = new Date()) {
    const contasInvestimento = state.cuentas.filter(c => ['vault_fixa','vault_variavel'].includes(c.tipo));
    const ids = new Set(contasInvestimento.map(c => String(c.id)));
    const records = (state.historialPatrimonio || []).filter(r => ids.has(String(r.cuentaId)) &&
        new Date(r.fecha).getTime() <= now.getTime()).slice().sort((a,b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
    const saldosAtuais = {};
    const initialized = new Set();
    const history = [];
    for (const r of records) {
        saldosAtuais[r.cuentaId] = r.monto;
        initialized.add(String(r.cuentaId));
        // A portfolio comparison needs an opening balance for every current asset.
        if (initialized.size !== ids.size) continue;
        const point = { date: new Date(r.fecha).getTime(), value: contasInvestimento.reduce((sum,c) => sum + saldosAtuais[c.id],0) };
        if (history.at(-1)?.date === point.date) history[history.length - 1] = point;
        else history.push(point);
    }
    const totalCents = contasInvestimento.reduce((sum,c) => sum + (saldosAtuais[c.id] ?? 0),0);
    const isComplete = ids.size > 0 && initialized.size === ids.size;
    const yearStart = new Date(now.getFullYear(),0,1).getTime();
    const opening = history.filter(p => p.date < yearStart).at(-1);
    const baseline = opening || history[0];
    const variationCents = isComplete && baseline ? totalCents - baseline.value : null;
    const pct = variationCents == null ? null : baseline.value !== 0
        ? variationCents / Math.abs(baseline.value) * 100 : variationCents === 0 ? 0 : null;
    return { totalCents, variationCents, pct, history, contasInvestimento, saldosAtuais, isComplete,
        benchmarkKey: !isComplete ? 'nwAwaitingBalances' : opening ? 'nwVsYearStart' : 'nwVsFirstComplete',
        baselineDate: baseline?.date ?? null };
}