/**
 * Motor Financeiro (Domain Logic)
 * Centraliza as regras de negócio e cálculos matemáticos do aplicativo.
 * Nenhuma manipulação de DOM deve acontecer neste arquivo.
 */

export function calculateBalances(state, gastosMesActual, viewMonth, viewYear, hoy) {
    const isCurrentMonth = (viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear());
    const viewDate = new Date(viewYear, viewMonth, 1);
    const currentDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const totalGastadoMesCents = gastosMesActual.reduce((acc, g) => acc + g.monto, 0);

    let boletosPendientesCents = 0;
    if (viewDate > currentDate) {
        boletosPendientesCents = state.boletos.reduce((acc, b) => acc + b.monto, 0);
    } else if (isCurrentMonth) {
        boletosPendientesCents = state.boletos
            .filter(b => b.diaVencimiento >= hoy.getDate())
            .reduce((acc, b) => acc + b.monto, 0);
    }

    const liquidezLibreCents = state.presupuestoMensual - totalGastadoMesCents - boletosPendientesCents;

    let gastosHojeCents = 0;
    let diasRestantes = new Date(viewYear, viewMonth + 1, 0).getDate();

    if (isCurrentMonth) {
        diasRestantes = (diasRestantes - hoy.getDate()) + 1;
        const gastosHoje = gastosMesActual.filter(g => {
            const gDate = new Date(g.fecha);
            return gDate.getDate() === hoy.getDate() && gDate.getMonth() === hoy.getMonth() && gDate.getFullYear() === hoy.getFullYear();
        });
        gastosHojeCents = gastosHoje.reduce((acc, g) => acc + g.monto, 0);
    }

    const liquidezInicioDiaCents = liquidezLibreCents + gastosHojeCents;
    const tetoDoDiaCents = Math.max(0, Math.floor(liquidezInicioDiaCents / diasRestantes));
    const disponivelHojeCents = isCurrentMonth ? (tetoDoDiaCents - gastosHojeCents) : 0;

    return {
        totalGastadoMesCents,
        boletosPendientesCents,
        liquidezLibreCents,
        gastosHojeCents,
        tetoDoDiaCents,
        disponivelHojeCents,
        diasRestantes
    };
}

export function calculateNetWorth(state) {
    const contasInvestimento = state.cuentas.filter(c => c.tipo === 'vault_fixa' || c.tipo === 'vault_variavel');
    
    if (contasInvestimento.length === 0) {
        return { totalCents: 0, variationCents: 0, pct: 0, history: [], contasInvestimento, saldosAtuais: {}, benchmarkLabel: '' };
    }

    // Ordena o histórico de patrimônio cronologicamente
    const records = [...(state.historialPatrimonio || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    const timeline = [];
    const saldosAtuais = {};
    
    records.forEach(r => {
        saldosAtuais[r.cuentaId] = r.monto;
        const totalNoMomento = contasInvestimento.reduce((acc, c) => acc + (saldosAtuais[c.id] || 0), 0);
        timeline.push({ date: new Date(r.fecha).getTime(), value: totalNoMomento });
    });

    const currentTotal = timeline.length > 0 ? timeline[timeline.length - 1].value : 0;
    let variationCents = 0;
    let pct = 0;
    let benchmarkLabel = "vs. Início";

    if (timeline.length > 1) {
        const currentYear = new Date().getFullYear();
        
        // Busca o primeiro registro do ano atual (YTD - Year to Date)
        let benchmarkRecord = timeline.find(t => new Date(t.date).getFullYear() === currentYear);

        // Se não houver registro neste ano ou for o único, cai de volta para o primeiro registro histórico
        if (!benchmarkRecord || benchmarkRecord.date === timeline[timeline.length - 1].date) {
            benchmarkRecord = timeline.find(t => new Date(t.date).getFullYear() === currentYear && t !== timeline[timeline.length -1]);
            if (!benchmarkRecord) {
                benchmarkRecord = timeline[0];
                benchmarkLabel = "vs. Início Histórico";
            } else {
                benchmarkLabel = "vs. Início do Ano";
            }
        } else {
            benchmarkLabel = "vs. Início do Ano";
        }

        if (benchmarkRecord) {
            variationCents = currentTotal - benchmarkRecord.value;
            pct = benchmarkRecord.value > 0 ? (variationCents / benchmarkRecord.value) * 100 : 0;
        }
    }

    return { 
        totalCents: currentTotal, 
        variationCents, 
        pct, 
        history: timeline, 
        contasInvestimento, 
        saldosAtuais,
        benchmarkLabel
    };
}