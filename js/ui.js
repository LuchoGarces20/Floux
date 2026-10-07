import { t, currentLang, formatCurrency } from './i18n.js';
import { obtenerCategorias } from './categories.js';
import { calculateBalances } from './financeEngine.js';

export const UI_CONFIG = {
    WARNING_THRESHOLD: 0.2,
    ANIMATION_DURATION_MS: 800,
    TOAST_DURATION_MS: 3000
};

let filtroHistorialActivo = { tipo: 'todos', id: null };
let mostrarTodosGastos = false;
let diasSeleccionadosCalendario = new Set();

let modoEdicionGasto = false;

const HISTORY_TEXTS = {
    pt: {
        cancelEdit: 'Cancelar edição',
        monthEmpty: 'Nenhum gasto registrado neste mês.',
        filterEmpty: 'Nenhum gasto corresponde aos filtros selecionados.',
        recentEmpty: 'Nenhum gasto nos últimos sete dias. Use “Ver histórico completo do mês” para consultar os demais registros.',
        showMonth: 'Ver histórico completo do mês',
        showRecent: 'Mostrar apenas os últimos sete dias'
    },
    es: {
        cancelEdit: 'Cancelar edición',
        monthEmpty: 'No hay gastos registrados en este mes.',
        filterEmpty: 'Ningún gasto coincide con los filtros seleccionados.',
        recentEmpty: 'No hay gastos en los últimos siete días. Usa “Ver historial completo del mes” para consultar los demás registros.',
        showMonth: 'Ver historial completo del mes',
        showRecent: 'Mostrar solo los últimos siete días'
    },
    en: {
        cancelEdit: 'Cancel edit',
        monthEmpty: 'No expenses recorded for this month.',
        filterEmpty: 'No expenses match the selected filters.',
        recentEmpty: 'No expenses in the last seven days. Use “View full month history” to see the other records.',
        showMonth: 'View full month history',
        showRecent: 'Show only the last seven days'
    }
};

export function getHistoryText(key) {
    return (HISTORY_TEXTS[currentLang] || HISTORY_TEXTS.en)[key] || key;
}

export function setModoEdicionGasto(isEditing) {
    modoEdicionGasto = Boolean(isEditing);
}

export function obtenerVistaHistorial(gastosFiltrados, viewMonth, viewYear, hoy) {
    const isCurrentMonth = viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear();
    const hasDayFilter = diasSeleccionadosCalendario.size > 0;
    const hasFilter = hasDayFilter || filtroHistorialActivo.tipo !== 'todos';
    let gastosExibicao = gastosFiltrados;
    let mostrarAlternador = false;

    // Meses fechados e futuros são consultados por inteiro.
    if (isCurrentMonth && !hasDayFilter) {
        const inicioVentana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6);
        const inicioMes = new Date(viewYear, viewMonth, 1);
        const finVentana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
        const limiteInferior = Math.max(inicioVentana.getTime(), inicioMes.getTime());
        const gastosRecentes = gastosFiltrados.filter(g => {
            const timestamp = new Date(g.fecha).getTime();
            return timestamp >= limiteInferior && timestamp < finVentana.getTime();
        });
        mostrarAlternador = gastosRecentes.length < gastosFiltrados.length;
        if (!mostrarTodosGastos) gastosExibicao = gastosRecentes;
    }

    let mensajeVacio = '';
    if (gastosExibicao.length === 0) {
        if (gastosFiltrados.length > 0) {
            mensajeVacio = getHistoryText('recentEmpty');
        } else {
            mensajeVacio = getHistoryText(hasFilter ? 'filterEmpty' : 'monthEmpty');
        }
    }

    return { gastosExibicao, mostrarAlternador, mensajeVacio };
}


export function setFiltroHistorial(tipo, id = null) { filtroHistorialActivo = { tipo, id }; }
export function resetFiltrosHistorialState() { mostrarTodosGastos = false; diasSeleccionadosCalendario.clear(); }
export function toggleMostrarTodosGastos() { mostrarTodosGastos = !mostrarTodosGastos; }
export function limparDiaCalendario() { diasSeleccionadosCalendario.clear(); }

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

export function aplicarTraduccion(gastoEnEdicion) {
    document.querySelectorAll('[data-i18n]').forEach(el => el.innerText = t(el.getAttribute('data-i18n')));
    document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.getAttribute('data-i18n-ph')));
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))));
    
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    if (btnCancelarEdicion) btnCancelarEdicion.innerText = getHistoryText('cancelEdit');

    const btnGuardarGasto = document.getElementById('btn-guardar-gasto');
    if(btnGuardarGasto) btnGuardarGasto.innerText = gastoEnEdicion ? t('btnEdit') : t('btnAdd');
}

export function renderizarSelectCategorias(customCats) {
    const container = document.getElementById('categoria-chips');
    const inputHidden = document.getElementById('input-categoria');
    const selectBoleto = document.getElementById('input-boleto-categoria');
    const selectOnboardingBoleto = document.getElementById('input-onboarding-boleto-categoria');
    
    const categorias = obtenerCategorias(customCats);
    
    if (container && inputHidden) {
        const currentValue = inputHidden.value;
        container.innerHTML = '';
        
        categorias.forEach(cat => {
            const chip = document.createElement('div');
            chip.className = 'cat-chip';
            chip.dataset.id = cat.id;
            chip.innerHTML = `<span class="chip-emoji">${escapeHTML(cat.emoji)}</span><span class="chip-name">${escapeHTML(cat.nombre)}</span>`;
            
            chip.addEventListener('click', () => {
                document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                inputHidden.value = cat.id;
                chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
            
            container.appendChild(chip);
        });
        
        if (!currentValue && categorias.length > 0) {
            inputHidden.value = categorias[0].id;
            if(container.firstChild) container.firstChild.classList.add('active');
        } else if (currentValue && categorias.find(c => c.id === currentValue)) {
            inputHidden.value = currentValue;
            const activeChip = container.querySelector(`[data-id="${escapeHTML(currentValue)}"]`);
            if (activeChip) activeChip.classList.add('active');
        }
    }
    
    const optionsHTML = categorias.map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.emoji)} ${escapeHTML(c.nombre)}</option>`).join('');
    
    if (selectBoleto) {
        const currentBoletoVal = selectBoleto.value;
        selectBoleto.innerHTML = optionsHTML;
        if (currentBoletoVal && categorias.find(c => c.id === currentBoletoVal)) selectBoleto.value = currentBoletoVal;
    }
    
    if (selectOnboardingBoleto) {
        const currentBoletoVal = selectOnboardingBoleto.value;
        selectOnboardingBoleto.innerHTML = optionsHTML;
        if (currentBoletoVal && categorias.find(c => c.id === currentBoletoVal)) selectOnboardingBoleto.value = currentBoletoVal;
    }
}

export function renderSelectCuentas(state) {
    const select = document.getElementById('input-cuenta-origen');
    if (!select) return;
    const currentValue = select.value;
    
    select.innerHTML = state.cuentas.filter(c => c.tipo === 'cash' || c.tipo === 'credit').map(c => 
        `<option value="${escapeHTML(c.id)}">${escapeHTML(c.nombre)} ${c.tipo === 'credit' ? '(💳)' : '(💵)'}</option>`
    ).join('');
    
    if (currentValue && state.cuentas.find(c => c.id === currentValue)) {
        select.value = currentValue;
    } else if (state.cuentas.length > 0) {
        select.value = state.cuentas[0].id;
    }
}

export function renderCuentasList(state) {
    ['lista-cuentas', 'lista-onboarding-cuentas'].forEach(containerId => {
        const ul = document.getElementById(containerId);
        if(!ul) return;
        ul.innerHTML = '';
        const contasNormais = state.cuentas.filter(c => c.tipo === 'cash' || c.tipo === 'credit');
        contasNormais.forEach(c => {
            const li = document.createElement('li');
            li.className = 'list-item-flex';
            let typeLabel = t('accTypeCash');
            let badgeClass = 'badge-cash';
            
            if (c.tipo === 'credit') {
                typeLabel = `${t('accTypeCredit')} (Cierre: ${escapeHTML(String(c.cierreTC || ''))})`;
                badgeClass = 'badge-credit';
            } else if (c.tipo === 'investment') {
                typeLabel = t('accTypeInvestment');
                badgeClass = 'badge-credit';
            }
            
            li.innerHTML = `
                <div class="info">
                    <strong style="font-size: 1.1rem;">${escapeHTML(c.nombre)}</strong>
                    <div><span class="badge-tipo ${badgeClass}">${escapeHTML(typeLabel)}</span></div>
                </div>
                <div class="actions">
                    <button type="button" class="btn-eliminar-simple btn-eliminar-cuenta" data-id="${escapeHTML(c.id)}">🗑️</button>
                </div>
            `;
            ul.appendChild(li);
        });
    });
}

export function renderBoletosList(state) {
    ['lista-boletos', 'lista-onboarding-boletos'].forEach(containerId => {
        const ul = document.getElementById(containerId);
        if(!ul) return;
        ul.innerHTML = '';
        
        const categorias = obtenerCategorias(state.categoriasCustom);
        const hoy = new Date();
        
        const boletosPagosMes = new Set(
            state.historialGlobal.filter(g => {
                let mes = new Date(g.fecha).getMonth();
                let ano = new Date(g.fecha).getFullYear();
                if (g.mesEfectivo) {
                    const [eAno, eMes] = g.mesEfectivo.split('-').map(Number);
                    mes = eMes - 1;
                    ano = eAno;
                }
                return mes === hoy.getMonth() && ano === hoy.getFullYear() && g.boletoId;
            }).map(g => g.boletoId)
        );

        state.boletos.forEach(b => {
            const catInfo = categorias.find(c => c.id === b.categoria) || { emoji: '📌', nombre: b.categoria };
            const li = document.createElement('li');
            li.className = 'list-item-flex';
            
            const isPago = boletosPagosMes.has(b.id);
            const badgePago = isPago ? `<span class="badge-tipo badge-cash" style="margin-left: 8px;">✅ ${t('paidBadge')}</span>` : '';
            const btnPagar = isPago ? '' : `<button type="button" class="btn-eliminar-simple btn-pagar-boleto" data-id="${escapeHTML(b.id)}" style="background: rgba(16, 185, 129, 0.1); color: var(--success-color); margin-right: 8px;" title="Pagar">💳</button>`;
            
            li.innerHTML = `
                <div class="info">
                    <strong style="font-size: 1.15rem;">${escapeHTML(b.desc)}</strong>
                    <div>
                        <span class="badge-tipo badge-credit" style="background: var(--bg-color); color: var(--text-color);">${escapeHTML(catInfo.emoji)} Dia ${escapeHTML(String(b.diaVencimiento))} - ${formatCurrency(b.monto, state.monedaActual)}</span>
                        ${badgePago}
                    </div>
                </div>
                <div class="actions">
                    ${btnPagar}
                    <button type="button" class="btn-eliminar-simple btn-eliminar-boleto" data-id="${escapeHTML(b.id)}">🗑️</button>
                </div>
            `;
            ul.appendChild(li);
        });
    });
}

export function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, UI_CONFIG.TOAST_DURATION_MS);
}

export function animateValue(obj, endCents, duration, currency) {
    if (!obj) return;
    const startCents = parseInt(obj.dataset.rawVal || '0', 10);
    
    if (startCents === endCents) {
        obj.innerText = formatCurrency(endCents, currency);
        obj.dataset.rawVal = endCents;
        return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(startCents + (endCents - startCents) * easeProgress);
        
        obj.innerText = formatCurrency(currentVal, currency);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.dataset.rawVal = endCents;
            obj.innerText = formatCurrency(endCents, currency);
        }
    };
    window.requestAnimationFrame(step);
}

function updateHeaderDisplays(hoy, viewMonth, viewYear, localeStr) {
    const tituloLimite = document.getElementById('titulo-limite-hoy');
    if (tituloLimite) {
        const fechaFormateada = hoy.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric', month: 'short' });
        tituloLimite.innerText = `${t('limitToday')} - ${fechaFormateada}`;
    }
    
    const displayMonthEl = document.getElementById('display-current-month');
    if (displayMonthEl) {
        displayMonthEl.innerText = new Date(viewYear, viewMonth, 1).toLocaleDateString(localeStr, { month: 'long', year: 'numeric' }).toUpperCase();
    }
}

function updateBalances(state, balances) {
    animateValue(document.getElementById('display-diario'), balances.disponivelHojeCents, UI_CONFIG.ANIMATION_DURATION_MS, state.monedaActual);
    
    const displayLimiteHoje = document.getElementById('display-limite-hoje');
    if (displayLimiteHoje) {
        animateValue(displayLimiteHoje, balances.tetoDoDiaCents, UI_CONFIG.ANIMATION_DURATION_MS, state.monedaActual);
    }
    
    animateValue(document.getElementById('display-mensual'), balances.liquidezLibreCents, UI_CONFIG.ANIMATION_DURATION_MS, state.monedaActual);
    animateValue(document.getElementById('display-gastado'), balances.totalGastadoMesCents, UI_CONFIG.ANIMATION_DURATION_MS, state.monedaActual);
    
    const elDiario = document.getElementById('display-diario');
    if (balances.liquidezLibreCents < (state.presupuestoMensual * UI_CONFIG.WARNING_THRESHOLD)) {
        if(elDiario) elDiario.style.color = "var(--danger-color)";
    } else {
        if(elDiario) elDiario.style.color = "var(--primary-color)";
    }
}

function updateProgressIndicators(state, balances, diasEnElMes, diaCalculo, gastosMesActual) {
    const barraFill = document.getElementById('progreso-mensual-fill');
    
    if (barraFill) {
        const larguraVisual = Math.min(100, balances.percentualConsumido || 0);
        barraFill.style.width = `${larguraVisual}%`;
        
        if (balances.isExcedido) {
            barraFill.classList.add('overbudget-fill');
            barraFill.classList.remove('warning');
        } else if (balances.percentualConsumido >= 80) {
            barraFill.classList.add('warning');
            barraFill.classList.remove('overbudget-fill');
        } else {
            barraFill.classList.remove('warning', 'overbudget-fill');
        }
    }
    
    const zeroSpendBadge = document.getElementById('zero-spend-badge');
    if (zeroSpendBadge) {
        const gastosVariables = gastosMesActual.filter(g => !g.boletoId);
        const diasConGasto = new Set(gastosVariables.map(g => new Date(g.fecha).getDate()));
        let diasCero = 0;
        for (let d = 1; d <= diaCalculo; d++) if (!diasConGasto.has(d)) diasCero++;
        
        if (diasCero > 0) {
            zeroSpendBadge.innerText = ` ${diasCero} ${t('daysWithoutExpenses')}`;
            zeroSpendBadge.title = `${diasCero} ${t('daysWithoutExpenses')}`;
            zeroSpendBadge.classList.remove('oculto');
        } else {
            zeroSpendBadge.classList.add('oculto');
        }
    }
}

function renderCategoryChart(state, gastosMesActual, totalGastadoMesCents) {
    const contGrafico = document.getElementById('grafico-categorias');
    if (!contGrafico) return;
    contGrafico.innerHTML = '';
    
    const gastosVariables = gastosMesActual.filter(g => !g.boletoId);
    
    if (gastosVariables.length > 0 && totalGastadoMesCents > 0) {
        const sumasPorCatCents = {};
        gastosVariables.forEach(g => { sumasPorCatCents[g.categoria] = (sumasPorCatCents[g.categoria] || 0) + g.monto; });
        
        const categoriasActuales = obtenerCategorias(state.categoriasCustom);
        const fragChart = document.createDocumentFragment();
        
        for (const catId in sumasPorCatCents) {
            if(catId === 'otros_previo') continue;
            const porcentaje = (sumasPorCatCents[catId] / totalGastadoMesCents) * 100;
            const infoCat = categoriasActuales.find(c => c.id === catId) || { emoji: '📌', nombre: catId, color: 'var(--primary-color)' };
            
            const el = document.createElement('div');
            el.className = 'cat-bar-container';
            
            const label = document.createElement('div');
            label.className = 'cat-bar-label';
            label.title = infoCat.nombre;
            label.textContent = `${infoCat.emoji} ${infoCat.nombre}`;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'cat-bar-wrapper';
            
            const fill = document.createElement('div');
            fill.className = 'cat-bar-fill';
            fill.style.width = `${porcentaje}%`;
            fill.style.backgroundColor = infoCat.color || 'var(--primary-color)';
            wrapper.appendChild(fill);
            
            const amount = document.createElement('div');
            amount.className = 'cat-bar-amount';
            amount.textContent = formatCurrency(sumasPorCatCents[catId], state.monedaActual);
            
            el.appendChild(label);
            el.appendChild(wrapper);
            el.appendChild(amount);
            fragChart.appendChild(el);
        }
        contGrafico.appendChild(fragChart);
    } else {
        contGrafico.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🌱</div><div style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px; font-size: 1.1rem;">${t('emptyStateTitle')}</div><div class="no-expenses-text" style="font-size: 0.9rem; max-width: 85%; line-height: 1.4;">${t('emptyStateMsg')}</div></div>`;
    }
}

export function renderFiltrosHistorial(state, gastosMesActual, onFilterSelect) {
    const container = document.getElementById('filtros-historial');
    if (!container) return;
    container.innerHTML = '';
    const items = [
        { tipo: 'todos', id: null, label: `✨ ${t('filterAll') || 'Todas'}` }
    ];
    const contas = state.cuentas.filter(c => c.tipo === 'cash' || c.tipo === 'credit');
    contas.forEach(c => {
        const icon = c.tipo === 'credit' ? '💳' : '💵';
        items.push({ tipo: 'cuenta', id: c.id, label: `${icon} ${c.nombre}` });
    });
    const categorias = obtenerCategorias(state.categoriasCustom);
    const catIdsNoMes = new Set(gastosMesActual.map(g => g.categoria));
    categorias.filter(c => catIdsNoMes.has(c.id)).forEach(cat => {
        items.push({ tipo: 'categoria', id: cat.id, label: `${cat.emoji} ${cat.nombre}` });
    });
    items.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'cat-chip';
        const isActive = filtroHistorialActivo.tipo === item.tipo && filtroHistorialActivo.id === item.id;
        
        if (isActive) chip.classList.add('active');
        chip.innerHTML = `<span class="chip-name">${escapeHTML(item.label)}</span>`;
        
        chip.addEventListener('click', () => {
            filtroHistorialActivo = { tipo: item.tipo, id: item.id };
            if (onFilterSelect) onFilterSelect();
        });
        
        container.appendChild(chip);
    });
}

export function renderMiniCalendario(state, gastosMesActual, viewMonth, viewYear, localeStr, onSelectDay) {
    const stripUI = document.getElementById('strip-calendario-dias');
    const btnLimpar = document.getElementById('btn-limpar-dia-calendario');
    if (!stripUI) return;
    
    stripUI.innerHTML = '';
    if (!stripUI.dataset.wheelBound) {
        stripUI.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                stripUI.scrollLeft += e.deltaY;
            }
        }, { passive: false });
        stripUI.dataset.wheelBound = 'true';
    }
    const totalDiasMes = new Date(viewYear, viewMonth + 1, 0).getDate();
    const hoy = new Date();
    const isCurrentMonth = (viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear());
    const diaHoje = hoy.getDate();
    
    const diasComGasto = new Set();
    gastosMesActual.forEach(g => {
        const d = new Date(g.fecha).getDate();
        diasComGasto.add(d);
    });
    if (btnLimpar) {
        if (diasSeleccionadosCalendario.size > 0) {
            btnLimpar.classList.remove('oculto');
            btnLimpar.innerText = diasSeleccionadosCalendario.size > 1 ? t('clearDays') : t('clearDate');
        } else {
            btnLimpar.classList.add('oculto');
        }
    }
    const frag = document.createDocumentFragment();
    
    for (let d = 1; d <= totalDiasMes; d++) {
        const dateObj = new Date(viewYear, viewMonth, d);
        const dayName = dateObj.toLocaleDateString(localeStr, { weekday: 'short' }).replace('.', '').substring(0, 3);
        
        const item = document.createElement('div');
        item.className = 'calendar-day-item';
        
        if (diasComGasto.has(d)) item.classList.add('has-spend');
        if (diasSeleccionadosCalendario.has(d)) item.classList.add('active');
        if (isCurrentMonth && d === diaHoje) item.classList.add('is-today');
        
        item.innerHTML = `
            <span class="day-week">${escapeHTML(dayName)}</span>
            <span class="day-num">${d}</span>
            ${diasComGasto.has(d) ? '<span class="day-dot"></span>' : ''}
        `;
        
        item.addEventListener('click', () => {
            if (diasSeleccionadosCalendario.has(d)) {
                diasSeleccionadosCalendario.delete(d);
            } else {
                diasSeleccionadosCalendario.add(d);
            }
            onSelectDay();
        });
        
        frag.appendChild(item);
    }
    
    stripUI.appendChild(frag);
    setTimeout(() => {
        const activeEl = stripUI.querySelector('.calendar-day-item.active');
        const todayEl = stripUI.querySelector('.calendar-day-item.is-today');
        const targetEl = activeEl || (isCurrentMonth ? todayEl : stripUI.querySelector('.calendar-day-item'));
        
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 50);
}

export function renderExpenseList(state, gastosMesActual, localeStr, allowEdit, mensajeVacio = '') {
    const listaUI = document.getElementById('lista-historial');
    if (!listaUI) return;
    listaUI.innerHTML = '';
    
    if (gastosMesActual.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-expenses-li';
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        const message = document.createElement('div');
        message.className = 'no-expenses-text';
        message.textContent = mensajeVacio || getHistoryText('monthEmpty');
        emptyState.appendChild(message);
        li.appendChild(emptyState);
        listaUI.appendChild(li);
        return;
    }

    const gastosOrdenados = [...gastosMesActual].sort((a, b) => {
        const timeA = new Date(a.fecha).getTime();
        const timeB = new Date(b.fecha).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return b.id - a.id;
    });
    const categoriasActuales = obtenerCategorias(state.categoriasCustom);
    const fragList = document.createDocumentFragment();
    
    gastosOrdenados.forEach(g => {
        const fechaStr = new Date(g.fecha).toLocaleString(localeStr, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
        const infoCat = categoriasActuales.find(c => c.id === g.categoria) || { emoji: '📌', nombre: g.categoria };
        
        const li = document.createElement('li');
        li.className = 'swipe-item';
        
        if (Date.now() - g.id < 2000) {
            li.classList.add('new-item');
        }
        
        const swipeActions = document.createElement('div');
        swipeActions.className = 'swipe-actions';
        
        if (allowEdit) {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.dataset.id = String(g.id);
            editBtn.setAttribute('aria-label', t('btnEdit'));
            editBtn.textContent = '✏️';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.dataset.id = String(g.id);
            deleteBtn.setAttribute('aria-label', t('btnDeleteAria'));
            deleteBtn.textContent = '🗑️';
            
            swipeActions.appendChild(editBtn);
            swipeActions.appendChild(deleteBtn);
        }
        
        const swipeContent = document.createElement('div');
        swipeContent.className = 'swipe-content';
        
        const catIcon = document.createElement('div');
        catIcon.className = 'cat-icon';
        catIcon.textContent = infoCat.emoji;
        
        const expenseInfo = document.createElement('div');
        expenseInfo.className = 'expense-info';
        
        const expDesc = document.createElement('span');
        expDesc.className = 'expense-desc';
        expDesc.title = g.desc;
        expDesc.textContent = g.desc;
        
        const expCat = document.createElement('span');
        expCat.className = 'expense-cat';
        
        let walletBadge = '';
        if (g.cuentaId) {
            const accountInfo = state.cuentas.find(c => c.id === g.cuentaId);
            if (accountInfo) walletBadge = ` - ${accountInfo.nombre}`;
        }
        expCat.textContent = infoCat.nombre + walletBadge;
        
        const expDate = document.createElement('span');
        expDate.className = 'expense-date';
        expDate.textContent = fechaStr;
        
        expenseInfo.appendChild(expDesc);
        expenseInfo.appendChild(expCat);
        expenseInfo.appendChild(expDate);
        
        const expAmount = document.createElement('span');
        expAmount.className = 'expense-amount';
        expAmount.style.marginRight = '8px';
        expAmount.textContent = formatCurrency(g.monto, state.monedaActual);
        
        swipeContent.appendChild(catIcon);
        swipeContent.appendChild(expenseInfo);
        swipeContent.appendChild(expAmount);
        
        li.appendChild(swipeActions);
        li.appendChild(swipeContent);
        fragList.appendChild(li);
    });
    
    listaUI.appendChild(fragList);
}

export function actualizarInterfaz(state, viewMonth, viewYear, hoy) {
    const localeStr = currentLang === 'es' ? 'es-ES' : (currentLang === 'pt' ? 'pt-BR' : 'en-US');
    const isCurrentMonth = (viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear());

    const gastosMesActual = state.historialGlobal.filter(g => {
        const d = new Date(g.fecha);
        let mes = d.getMonth();
        let ano = d.getFullYear();
        
        if (g.mesEfectivo) {
            const [eAno, eMes] = g.mesEfectivo.split('-').map(Number);
            mes = eMes - 1;
            ano = eAno;
        }
        return mes === viewMonth && ano === viewYear;
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);

    if (filtroHistorialActivo.tipo === 'cuenta' && !state.cuentas.some(c => c.id === filtroHistorialActivo.id)) {
        filtroHistorialActivo = { tipo: 'todos', id: null };
    }

    let gastosFiltrados = gastosMesActual;
    if (filtroHistorialActivo.tipo === 'cuenta') {
        gastosFiltrados = gastosMesActual.filter(g => g.cuentaId === filtroHistorialActivo.id);
    } else if (filtroHistorialActivo.tipo === 'categoria') {
        gastosFiltrados = gastosMesActual.filter(g => g.categoria === filtroHistorialActivo.id);
    }

    if (diasSeleccionadosCalendario.size > 0) {
        gastosFiltrados = gastosFiltrados.filter(g => diasSeleccionadosCalendario.has(new Date(g.fecha).getDate()));
    }

    const containerMostrarMais = document.getElementById('container-mostrar-mais');
    const labelMostrarMais = document.getElementById('label-mostrar-mais');
    const { gastosExibicao, mostrarAlternador, mensajeVacio } =
        obtenerVistaHistorial(gastosFiltrados, viewMonth, viewYear, hoy);

    if (containerMostrarMais) {
        containerMostrarMais.classList.toggle('oculto', !mostrarAlternador);
    }
    if (labelMostrarMais && mostrarAlternador) {
        labelMostrarMais.innerText = getHistoryText(mostrarTodosGastos ? 'showRecent' : 'showMonth');
    }

    const infoSomaEl = document.getElementById('info-soma-filtro');
    const textoSomaEl = document.getElementById('texto-soma-filtro');
    if (infoSomaEl && textoSomaEl) {
        if (filtroHistorialActivo.tipo !== 'todos' || diasSeleccionadosCalendario.size > 0) {
            const totalFiltroCents = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0);

            let nomeFiltro = '';
            if (filtroHistorialActivo.tipo === 'cuenta') {
                const acc = state.cuentas.find(c => c.id === filtroHistorialActivo.id);
                nomeFiltro = acc ? acc.nombre : '';
            } else if (filtroHistorialActivo.tipo === 'categoria') {
                const cats = obtenerCategorias(state.categoriasCustom);
                const cat = cats.find(c => c.id === filtroHistorialActivo.id);
                nomeFiltro = cat ? `${cat.emoji} ${cat.nombre}` : '';
            }
            if (diasSeleccionadosCalendario.size > 0) {
                const diasOrdenados = Array.from(diasSeleccionadosCalendario).sort((a, b) => a - b);
                const textoDias = diasOrdenados.length === 1 ? `${t('daySingular')} ${diasOrdenados[0]}` : `${t('dayPlural')} ${diasOrdenados.join(', ')}`;
                nomeFiltro += (nomeFiltro ? ' + ' : '') + textoDias;
            }
            const labelTotal = t('filterTotal') || 'Total do Filtro:';
            textoSomaEl.innerText = `${labelTotal} ${formatCurrency(totalFiltroCents, state.monedaActual)} (${nomeFiltro})`;
            infoSomaEl.classList.remove('oculto');
        } else {
            infoSomaEl.classList.add('oculto');
        }
    }

    const viewDate = new Date(viewYear, viewMonth, 1);
    const currentMonthDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const isPastMonth = viewDate < currentMonthDate;

    const temDadosFuturos = state.historialGlobal.some(g => {
        let mes = new Date(g.fecha).getMonth();
        let ano = new Date(g.fecha).getFullYear();
        if (g.mesEfectivo) {
            const [eAno, eMes] = g.mesEfectivo.split('-').map(Number);
            mes = eMes - 1;
            ano = eAno;
        }
        return new Date(ano, mes, 1) > viewDate;
    });

    const btnNext = document.getElementById('btn-next-month');
    if (btnNext) {
        btnNext.disabled = !(isPastMonth || temDadosFuturos);
    }

    const balances = calculateBalances(state, gastosMesActual, viewMonth, viewYear, hoy);
    const totalGastadoMesCents = balances.totalGastadoMesCents;

    const diasEnElMes = new Date(viewYear, viewMonth + 1, 0).getDate();
    const diaCalculo = isCurrentMonth ? hoy.getDate() : diasEnElMes;

    updateHeaderDisplays(hoy, viewMonth, viewYear, localeStr);
    renderSelectCuentas(state);

    const areaRegistro = document.getElementById('area-registrar-gasto');
    const areaResumen = document.getElementById('resumen-mes-pasado');
    const dailyCards = document.querySelectorAll('.daily-card');
    const fabGasto = document.getElementById('btn-fab-gasto');

    if (areaRegistro) {
        areaRegistro.classList.toggle('oculto', !(isCurrentMonth || modoEdicionGasto));
    }

    if (isCurrentMonth) {
        if(areaResumen) areaResumen.classList.add('oculto');
        dailyCards.forEach(c => c.style.display = 'block');
        if(fabGasto) fabGasto.classList.remove('oculto');
    } else {
        if(areaResumen) areaResumen.classList.remove('oculto');
        dailyCards.forEach(c => c.style.display = 'none');
        if(fabGasto) fabGasto.classList.add('oculto');

        if (areaResumen) {
            const perfEl = document.getElementById('summary-performance');
            const dineroRestanteCents = state.presupuestoMensual - totalGastadoMesCents;

            if (dineroRestanteCents >= 0) {
                perfEl.innerText = `${t('summarySave')}${formatCurrency(dineroRestanteCents, state.monedaActual)}`;
                perfEl.style.color = 'var(--success-color)';
            } else {
                perfEl.innerText = `${t('summaryDeficit')}${formatCurrency(Math.abs(dineroRestanteCents), state.monedaActual)}`;
                perfEl.style.color = 'var(--danger-color)';
            }

            const largest = gastosMesActual.length > 0 ? Math.max(...gastosMesActual.map(g => g.monto)) : 0;
            document.getElementById('summary-largest').innerText = formatCurrency(largest, state.monedaActual);
            document.getElementById('summary-daily').innerText = formatCurrency(totalGastadoMesCents / diasEnElMes, state.monedaActual);
        }
    }

    const cardDiario = document.querySelector('.daily-card.highlight');
    const tituloDiario = document.getElementById('titulo-disponivel-hoje');

    if (cardDiario && tituloDiario) {
        if (balances.isExcedido) {
            cardDiario.classList.add('overbudget-card');
            tituloDiario.innerText = t('overbudgetTitle') || "Teto Excedido";
        } else {
            cardDiario.classList.remove('overbudget-card');
            tituloDiario.innerText = t('availableToday') || "Disponível Hoje";
        }
    }

    updateBalances(state, balances);
    updateProgressIndicators(state, balances, diasEnElMes, diaCalculo, gastosMesActual);
    renderCategoryChart(state, gastosMesActual, totalGastadoMesCents);

    renderFiltrosHistorial(state, gastosMesActual, () => {
        actualizarInterfaz(state, viewMonth, viewYear, hoy);
    });

    renderMiniCalendario(state, gastosMesActual, viewMonth, viewYear, localeStr, () => {
        actualizarInterfaz(state, viewMonth, viewYear, hoy);
    });

    renderExpenseList(state, gastosExibicao, localeStr, true, mensajeVacio);
}

export function resetFormularioGasto(setGastoCallback) {
    setGastoCallback(null);
    const inputMonto = document.getElementById('input-monto');
    
    const inputFecha = document.getElementById('input-fecha-gasto');
    if (inputFecha) {
        const hojeLocal = new Date();
        const ano = hojeLocal.getFullYear();
        const mes = String(hojeLocal.getMonth() + 1).padStart(2, '0');
        const dia = String(hojeLocal.getDate()).padStart(2, '0');
        inputFecha.value = `${ano}-${mes}-${dia}`;
    }
    if (inputMonto) {
        inputMonto.value = '';
        inputMonto.dataset.cents = '0';
    }
    document.getElementById('input-desc').value = '';
    
    const selectCuotas = document.getElementById('select-cuotas');
    if (selectCuotas) {
        selectCuotas.value = '1';
        selectCuotas.classList.remove('oculto');
    }
    
    const inputCuotas = document.getElementById('input-cuotas');
    if (inputCuotas) {
        inputCuotas.value = '1';
        inputCuotas.classList.add('oculto');
    }
    const containerCuotas = document.getElementById('container-cuotas');
    if (containerCuotas) {
        containerCuotas.style.display = '';
    }
    
    const warnEl = document.getElementById('edit-installment-warning');
    if (warnEl) warnEl.style.display = 'none';
    
    document.getElementById('btn-guardar-gasto').innerText = t('btnAdd');
    setTimeout(() => {
        const selectConta = document.getElementById('input-cuenta-origen');
        if (selectConta) selectConta.dispatchEvent(new Event('change'));
    }, 0);
}