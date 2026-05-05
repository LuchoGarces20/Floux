import { t, currentLang } from './i18n.js';
import { obtenerCategorias } from './categories.js';

export const WARNING_THRESHOLD = 0.2;

export function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

export function aplicarTraduccion(gastoEnEdicion) {
    document.querySelectorAll('[data-i18n]').forEach(el => el.innerText = t(el.getAttribute('data-i18n')));
    document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.getAttribute('data-i18n-ph')));
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))));

    const btnGuardarGasto = document.getElementById('btn-guardar-gasto');
    if(btnGuardarGasto) {
        btnGuardarGasto.innerText = gastoEnEdicion ? t('btnEdit') : t('btnAdd');
    }
}

export function renderizarSelectCategorias(customCats) {
    const select = document.getElementById('input-categoria');
    const currentValue = select.value;
    select.innerHTML = '';
    
    const categorias = obtenerCategorias(customCats);
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.emoji} ${cat.nombre}`;
        select.appendChild(option);
    });
    if(currentValue && categorias.find(c => c.id === currentValue)) select.value = currentValue;
}

export function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

export function actualizarInterfaz(state, viewMonth, viewYear, hoy) {
    const localeStr = currentLang === 'es' ? 'es-ES' : (currentLang === 'pt' ? 'pt-BR' : 'en-US');
    const formatoDinero = new Intl.NumberFormat(localeStr, { style: 'currency', currency: state.monedaActual });
    
    const tituloLimite = document.getElementById('titulo-limite-hoy');
    if (tituloLimite) {
        const fechaFormateada = hoy.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric', month: 'short' });
        tituloLimite.innerText = `${t('limitToday')} - ${fechaFormateada}`;
    }

    const dateForDisplay = new Date(viewYear, viewMonth, 1);
    const displayMonthEl = document.getElementById('display-current-month');
    if (displayMonthEl) {
        displayMonthEl.innerText = dateForDisplay.toLocaleDateString(localeStr, { month: 'long', year: 'numeric' }).toUpperCase();
    }

    const gastosMesActual = state.historialGlobal.filter(g => new Date(g.fecha).getMonth() === viewMonth && new Date(g.fecha).getFullYear() === viewYear);
    const totalGastadoMesCents = gastosMesActual.reduce((acc, g) => acc + g.monto, 0);
    const dineroRestanteCents = state.presupuestoMensual - totalGastadoMesCents;
    
const isCurrentMonth = (viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear());
    const areaRegistro = document.getElementById('area-registrar-gasto');
    const areaResumen = document.getElementById('resumen-mes-pasado');
    const cardDiario = document.querySelector('.balance-card.highlight');
    const fabGasto = document.getElementById('btn-fab-gasto'); // Nova referência

    if (isCurrentMonth) {
        if(areaRegistro) areaRegistro.classList.remove('oculto');
        if(areaResumen) areaResumen.classList.add('oculto');
        if(cardDiario) cardDiario.style.display = 'block';
        if(fabGasto) fabGasto.classList.remove('oculto'); // Mostra o botão
    } else {
        if(areaRegistro) areaRegistro.classList.add('oculto');
        if(areaResumen) areaResumen.classList.remove('oculto');
        if(cardDiario) cardDiario.style.display = 'none';
        if(fabGasto) fabGasto.classList.add('oculto'); // Oculta o botão

        if (areaResumen) {
            const perfEl = document.getElementById('summary-performance');
            if (dineroRestanteCents >= 0) {
                perfEl.innerText = `${t('summarySave')}${formatoDinero.format(dineroRestanteCents / 100)}`;
                perfEl.style.color = 'var(--success-color)';
            } else {
                perfEl.innerText = `${t('summaryDeficit')}${formatoDinero.format(Math.abs(dineroRestanteCents) / 100)}`;
                perfEl.style.color = 'var(--danger-color)';
            }
            const largest = gastosMesActual.length > 0 ? Math.max(...gastosMesActual.map(g => g.monto)) : 0;
            document.getElementById('summary-largest').innerText = formatoDinero.format(largest / 100);
            
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const dailyAvg = totalGastadoMesCents / daysInMonth;
            document.getElementById('summary-daily').innerText = formatoDinero.format(dailyAvg / 100);
        }
    }

    const diasRestantes = (new Date(viewYear, viewMonth + 1, 0).getDate() - hoy.getDate()) + 1;
    const presupuestoDiarioCents = Math.max(0, Math.floor(dineroRestanteCents / diasRestantes));
    
    const elDiario = document.getElementById('display-diario');
    const elMensual = document.getElementById('display-mensual');
    const elGastado = document.getElementById('display-gastado');
    const barraFill = document.getElementById('progreso-mensual-fill');

    if (elDiario) elDiario.innerText = formatoDinero.format(presupuestoDiarioCents / 100);
    if (elMensual) elMensual.innerText = formatoDinero.format(dineroRestanteCents / 100);
    if (elGastado) elGastado.innerText = formatoDinero.format(totalGastadoMesCents / 100);

    let porcentajeGastado = (totalGastadoMesCents / state.presupuestoMensual) * 100;
    if (porcentajeGastado > 100 || isNaN(porcentajeGastado)) porcentajeGastado = 100;
    if (barraFill) barraFill.style.width = `${porcentajeGastado}%`;
    
    if (dineroRestanteCents < (state.presupuestoMensual * WARNING_THRESHOLD)) {
        if(barraFill) barraFill.classList.add('warning');
        if(elDiario) elDiario.style.color = "var(--danger-color)";
    } else {
        if(barraFill) barraFill.classList.remove('warning');
        if(elDiario) elDiario.style.color = "var(--primary-color)";
    }

    // Ritmo de Gasto (Sparkline)
    const diasEnElMes = new Date(viewYear, viewMonth + 1, 0).getDate();
    const diaCalculo = isCurrentMonth ? hoy.getDate() : diasEnElMes;
    const porcentajeTiempo = diaCalculo / diasEnElMes;
    
    const paceSparkline = document.getElementById('pace-sparkline');
    if (paceSparkline) {
        let porcentajePresupuesto = totalGastadoMesCents / state.presupuestoMensual;
        if (!isFinite(porcentajePresupuesto)) porcentajePresupuesto = 0;
        
        paceSparkline.style.width = `${porcentajeTiempo * 100}%`;
        paceSparkline.className = (porcentajePresupuesto > porcentajeTiempo) ? 'pace-sparkline-fill bad' : 'pace-sparkline-fill good';
    }

    // Seguimiento de "Días Cero"
    const zeroSpendBadge = document.getElementById('zero-spend-badge');
    if (zeroSpendBadge) {
        const diasConGasto = new Set(gastosMesActual.map(g => new Date(g.fecha).getDate()));
        let diasCero = 0;
        
        for (let d = 1; d <= diaCalculo; d++) {
            if (!diasConGasto.has(d)) diasCero++;
        }
        
        if (diasCero > 0) {
            zeroSpendBadge.innerText = `🔥 ${diasCero} Días sin gastos`;
            zeroSpendBadge.title = `${diasCero} Días sin gastos`;
            zeroSpendBadge.classList.remove('oculto');
        } else {
            zeroSpendBadge.classList.add('oculto');
        }
    }

    const contGrafico = document.getElementById('grafico-categorias');
    const categoriasActuales = obtenerCategorias(state.categoriasCustom);
    
    const emptyStateHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🚀</div>
            <div style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px; font-size: 1.1rem;">${t('emptyStateTitle')}</div>
            <div class="no-expenses-text" style="font-size: 0.9rem; max-width: 85%; line-height: 1.4;">
                ${t('emptyStateMsg')}
            </div>
        </div>
    `;
    
    contGrafico.innerHTML = '';
    
    if (gastosMesActual.length > 0) {
        const sumasPorCatCents = {};
        gastosMesActual.forEach(g => { sumasPorCatCents[g.categoria] = (sumasPorCatCents[g.categoria] || 0) + g.monto; });
        
        const fragChart = document.createDocumentFragment();
        for (const catId in sumasPorCatCents) {
            if(catId === 'otros_previo') continue;
            
            const porcentaje = (sumasPorCatCents[catId] / totalGastadoMesCents) * 100;
            const infoCat = categoriasActuales.find(c => c.id === catId) || { emoji: '🏷️', nombre: catId, color: 'var(--primary-color)' };
            
            const el = document.createElement('div');
            el.className = 'cat-bar-container';
            el.innerHTML = `
                <div class="cat-bar-label" title="${escapeHTML(infoCat.nombre)}">${escapeHTML(infoCat.emoji)} ${escapeHTML(infoCat.nombre)}</div>
                <div class="cat-bar-wrapper"><div class="cat-bar-fill" style="width: ${porcentaje}%; background-color: ${escapeHTML(infoCat.color || 'var(--primary-color)')};"></div></div>
                <div class="cat-bar-amount">${escapeHTML(formatoDinero.format(sumasPorCatCents[catId] / 100))}</div>
            `;
            fragChart.appendChild(el);
        }
        contGrafico.appendChild(fragChart);
    } else {
        contGrafico.innerHTML = emptyStateHTML;
    }

    const listaUI = document.getElementById('lista-historial');
    listaUI.innerHTML = '';
    
    if(gastosMesActual.length === 0) {
        listaUI.innerHTML = `<li class="no-expenses-li" style="display:block; padding:0;">${emptyStateHTML}</li>`;
    } else {
        const fragList = document.createDocumentFragment();
        for (let i = gastosMesActual.length - 1; i >= 0; i--) {
            const g = gastosMesActual[i];
            const fechaStr = new Date(g.fecha).toLocaleString(localeStr, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            const infoCat = categoriasActuales.find(c => c.id === g.categoria) || { emoji: '🏷️', nombre: g.categoria };
            
            const li = document.createElement('li');
            li.className = 'swipe-item';
            li.innerHTML = `
                <div class="swipe-actions">
                    ${isCurrentMonth ? `<button class="edit-btn" data-id="${g.id}">✏️</button><button class="delete-btn" data-id="${g.id}">🗑️</button>` : ''}
                </div>
                <div class="swipe-content">
                    <div class="cat-icon">${escapeHTML(infoCat.emoji)}</div>
                    <div class="expense-info">
                        <span class="expense-desc" title="${escapeHTML(g.desc)}">${escapeHTML(g.desc)}</span>
                        <span class="expense-cat">${escapeHTML(infoCat.nombre)}</span>
                        <span class="expense-date">${escapeHTML(fechaStr)}</span>
                    </div>
                    <span class="expense-amount" style="margin-right: 8px;">${escapeHTML(formatoDinero.format(g.monto / 100))}</span>
                </div>
            `;
            fragList.appendChild(li);
        }
        listaUI.appendChild(fragList);
    }
}

export function resetFormularioGasto(setGastoCallback) {
    setGastoCallback(null);
    document.getElementById('input-monto').value = '';
    document.getElementById('input-desc').value = '';
    document.getElementById('btn-guardar-gasto').innerText = t('btnAdd');
}