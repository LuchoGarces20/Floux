import { t, currentLang, formatCurrency } from './i18n.js';
import { obtenerCategorias } from './categories.js';
import { calculateBalances, calculateNetWorth } from './financeEngine.js';

export const UI_CONFIG = {
    WARNING_THRESHOLD: 0.2,
    ANIMATION_DURATION_MS: 800,
    TOAST_DURATION_MS: 3000
};

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
            chip.innerHTML = `<span class="chip-emoji">${cat.emoji}</span><span class="chip-name">${cat.nombre}</span>`;
            
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
            container.firstChild.classList.add('active');
        } else if (currentValue && categorias.find(c => c.id === currentValue)) {
            inputHidden.value = currentValue;
            const activeChip = container.querySelector(`[data-id="${currentValue}"]`);
            if (activeChip) activeChip.classList.add('active');
        } else if (categorias.length > 0) {
            inputHidden.value = categorias[0].id;
            container.firstChild.classList.add('active');
        }
    }
    
    const optionsHTML = categorias.map(c => `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`).join('');
    
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
    
    // FILTRO RIGOROSO: Só puxa cash e credit
    select.innerHTML = state.cuentas.filter(c => c.tipo === 'cash' || c.tipo === 'credit').map(c => 
        `<option value="${c.id}">${escapeHTML(c.nombre)} ${c.tipo === 'credit' ? '(💳)' : '(💵)'}</option>`
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

        // FILTRO RIGOROSO: Impede os ativos do vault de aparecerem na lista de gerenciar contas
        const contasNormais = state.cuentas.filter(c => c.tipo === 'cash' || c.tipo === 'credit');

        contasNormais.forEach(c => {
            const li = document.createElement('li');
            li.className = 'list-item-flex';
            let typeLabel = t('accTypeCash');
            let badgeClass = 'badge-cash';
            
            if (c.tipo === 'credit') {
                typeLabel = `${t('accTypeCredit')} (Cierre: ${c.cierreTC})`;
                badgeClass = 'badge-credit';
            } else if (c.tipo === 'investment') {
                typeLabel = t('accTypeInvestment');
                badgeClass = 'badge-credit';
            }
            
            li.innerHTML = `
                <div class="info">
                    <strong style="font-size: 1.1rem;">${escapeHTML(c.nombre)}</strong>
                    <div><span class="badge-tipo ${badgeClass}">${typeLabel}</span></div>
                </div>
                <div class="actions">
                    <button type="button" class="btn-eliminar-simple btn-eliminar-cuenta" data-id="${c.id}">🗑️</button>
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
        
        state.boletos.forEach(b => {
            const catInfo = categorias.find(c => c.id === b.categoria) || { emoji: '📍', nombre: b.categoria };
            const li = document.createElement('li');
            li.className = 'list-item-flex';
            
            li.innerHTML = `
                <div class="info">
                    <strong style="font-size: 1.1rem;">${escapeHTML(b.desc)}</strong>
                    <div><span class="badge-tipo badge-credit" style="background: var(--bg-color); color: var(--text-color);">${catInfo.emoji} Dia ${b.diaVencimiento} - ${formatCurrency(b.monto, state.monedaActual)}</span></div>
                </div>
                <div class="actions">
                    <button type="button" class="btn-eliminar-simple btn-eliminar-boleto" data-id="${b.id}">🗑️</button>
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
    const startCents = parseInt(obj.dataset.rawVal || 0, 10);
    
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

function updateProgressIndicators(state, totalGastadoMesCents, diasEnElMes, diaCalculo, gastosMesActual) {
    const barraFill = document.getElementById('progreso-mensual-fill');
    let porcentajeGastado = (totalGastadoMesCents / state.presupuestoMensual) * 100;
    if (porcentajeGastado > 100 || isNaN(porcentajeGastado)) porcentajeGastado = 100;
    
    if (barraFill) {
        barraFill.style.width = `${porcentajeGastado}%`;
        if (state.presupuestoMensual - totalGastadoMesCents < (state.presupuestoMensual * UI_CONFIG.WARNING_THRESHOLD)) {
            barraFill.classList.add('warning');
        } else {
            barraFill.classList.remove('warning');
        }
    }
    
    const zeroSpendBadge = document.getElementById('zero-spend-badge');
    if (zeroSpendBadge) {
        const diasConGasto = new Set(gastosMesActual.map(g => new Date(g.fecha).getDate()));
        let diasCero = 0;
        for (let d = 1; d <= diaCalculo; d++) if (!diasConGasto.has(d)) diasCero++;
        
        if (diasCero > 0) {
            zeroSpendBadge.innerText = `🔥 ${diasCero} Dias sem gastos`;
            zeroSpendBadge.title = `${diasCero} Dias sem gastos`;
            zeroSpendBadge.classList.remove('oculto');
        } else {
            zeroSpendBadge.classList.add('oculto');
        }
    }
}

function renderCategoryChart(state, gastosMesActual, totalGastadoMesCents) {
    const contGrafico = document.getElementById('grafico-categorias');
    contGrafico.innerHTML = '';
    
    if (gastosMesActual.length > 0) {
        const sumasPorCatCents = {};
        gastosMesActual.forEach(g => { sumasPorCatCents[g.categoria] = (sumasPorCatCents[g.categoria] || 0) + g.monto; });
        
        const categoriasActuales = obtenerCategorias(state.categoriasCustom);
        const fragChart = document.createDocumentFragment();
        
        for (const catId in sumasPorCatCents) {
            if(catId === 'otros_previo') continue;
            const porcentaje = (sumasPorCatCents[catId] / totalGastadoMesCents) * 100;
            const infoCat = categoriasActuales.find(c => c.id === catId) || { emoji: '📍', nombre: catId, color: 'var(--primary-color)' };
            
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
        contGrafico.innerHTML = `<div class="empty-state"><div class="empty-state-icon">☕</div><div style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px; font-size: 1.1rem;">${t('emptyStateTitle')}</div><div class="no-expenses-text" style="font-size: 0.9rem; max-width: 85%; line-height: 1.4;">${t('emptyStateMsg')}</div></div>`;
    }
}

function renderExpenseList(state, gastosMesActual, localeStr, allowEdit) {
    const listaUI = document.getElementById('lista-historial');
    listaUI.innerHTML = '';
    
    if(gastosMesActual.length === 0) {
        listaUI.innerHTML = `<li class="no-expenses-li" style="display:block; padding:0;"><div class="empty-state"><div class="empty-state-icon">☕</div><div style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px; font-size: 1.1rem;">${t('emptyStateTitle')}</div><div class="no-expenses-text" style="font-size: 0.9rem; max-width: 85%; line-height: 1.4;">${t('emptyStateMsg')}</div></div></li>`;
        return;
    }
    const categoriasActuales = obtenerCategorias(state.categoriasCustom);
    const fragList = document.createDocumentFragment();
    
    for (let i = gastosMesActual.length - 1; i >= 0; i--) {
        const g = gastosMesActual[i];
        const fechaStr = new Date(g.fecha).toLocaleString(localeStr, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
        const infoCat = categoriasActuales.find(c => c.id === g.categoria) || { emoji: '📍', nombre: g.categoria };
        
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
            editBtn.dataset.id = g.id;
            editBtn.setAttribute('aria-label', t('btnEdit'));
            editBtn.textContent = '✏️';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.dataset.id = g.id;
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
    }
    listaUI.appendChild(fragList);
}

export function actualizarInterfaz(state, viewMonth, viewYear, hoy) {
    const localeStr = currentLang === 'es' ? 'es-ES' : (currentLang === 'pt' ? 'pt-BR' : 'en-US');
    const isCurrentMonth = (viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear());
    
    const gastosMesActual = state.historialGlobal.filter(g => {
        let mes = new Date(g.fecha).getMonth();
        let ano = new Date(g.fecha).getFullYear();
        if (g.mesEfectivo) {
            const [eAno, eMes] = g.mesEfectivo.split('-').map(Number);
            mes = eMes - 1;
            ano = eAno;
        }
        return mes === viewMonth && ano === viewYear;
    });
    
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
    
    if (isCurrentMonth) {
        if(areaRegistro) areaRegistro.classList.remove('oculto');
        if(areaResumen) areaResumen.classList.add('oculto');
        dailyCards.forEach(c => c.style.display = 'block');
        if(fabGasto) fabGasto.classList.remove('oculto');
    } else {
        if(areaRegistro) areaRegistro.classList.add('oculto');
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
    
    updateBalances(state, balances);
    updateProgressIndicators(state, totalGastadoMesCents, diasEnElMes, diaCalculo, gastosMesActual);
    renderCategoryChart(state, gastosMesActual, totalGastadoMesCents);
    renderExpenseList(state, gastosMesActual, localeStr, !isPastMonth);
}

export function resetFormularioGasto(setGastoCallback) {
    setGastoCallback(null);
    const inputMonto = document.getElementById('input-monto');
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
    
    document.getElementById('btn-guardar-gasto').innerText = t('btnAdd');
}