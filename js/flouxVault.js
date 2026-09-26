import { state, saveStore, addRegistroPatrimonio } from './store.js';
import { t, formatCurrency } from './i18n.js';
import { calculateNetWorth } from './financeEngine.js';
import { escapeHTML, showToast } from './ui.js';

function drawSVGChart(dataPoints) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 400 180");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("nw-svg");
    
    if(dataPoints.length === 0) return svg;
    if(dataPoints.length === 1) dataPoints = [ { date: dataPoints[0].date - 86400000, value: 0 }, dataPoints[0] ];
    
    const minX = dataPoints[0].date;
    const maxX = dataPoints[dataPoints.length - 1].date;
    const minY = Math.min(...dataPoints.map(d => d.value));
    const maxY = Math.max(...dataPoints.map(d => d.value));
    const padY = (maxY - minY) * 0.1 || 1000;
    const yMin = Math.max(0, minY - padY);
    const yMax = maxY + padY;
    
    const xRange = maxX - minX || 1;
    const yRange = yMax - yMin;
    
    const getX = (date) => 10 + ((date - minX) / xRange) * 380;
    const getY = (val) => 150 - (((val - yMin) / yRange) * 140);
    
    const defs = document.createElementNS(svgNS, "defs");
    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.id = "nw-gradient";
    gradient.setAttribute("x1", "0%"); gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "0%"); gradient.setAttribute("y2", "100%");
    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%"); stop1.setAttribute("stop-color", "var(--primary-color)"); stop1.setAttribute("stop-opacity", "0.4");
    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%"); stop2.setAttribute("stop-color", "var(--primary-color)"); stop2.setAttribute("stop-opacity", "0.0");
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    let polylinePoints = "";
    const frag = document.createDocumentFragment();
    const pointsData = [];

    dataPoints.forEach((dp, index) => {
        const x = getX(dp.date);
        const y = getY(dp.value);
        polylinePoints += `${x},${y} `;
        pointsData.push({ x, y, date: dp.date, value: dp.value });

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "4");
        circle.classList.add("nw-point");
        if (index === dataPoints.length - 1) circle.classList.add("nw-point-newest");
        frag.appendChild(circle);
    });
    
    const startX = getX(dataPoints[0].date);
    const endX = getX(dataPoints[dataPoints.length - 1].date);
    const areaPoints = `${startX},150 ${polylinePoints} ${endX},150`;
    const area = document.createElementNS(svgNS, "polygon");
    area.setAttribute("points", areaPoints.trim());
    area.classList.add("nw-area");
    svg.appendChild(area);

    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("points", polylinePoints.trim());
    polyline.classList.add("nw-line");
    svg.appendChild(polyline);

    const crosshair = document.createElementNS(svgNS, "line");
    crosshair.setAttribute("y1", "0");
    crosshair.setAttribute("y2", "150");
    crosshair.classList.add("nw-crosshair");
    crosshair.id = "nw-crosshair";
    svg.appendChild(crosshair);
    svg.appendChild(frag);

    const locale = navigator.language.startsWith('pt') ? 'pt-BR' : 'es-ES';
    const formatShortDate = (timestamp) => new Date(timestamp).toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace('.', '');

    const labelLeft = document.createElementNS(svgNS, "text");
    labelLeft.setAttribute("x", "10"); labelLeft.setAttribute("y", "172");
    labelLeft.classList.add("nw-axis-text");
    labelLeft.setAttribute("text-anchor", "start");
    labelLeft.textContent = formatShortDate(minX);
    svg.appendChild(labelLeft);

    const labelRight = document.createElementNS(svgNS, "text");
    labelRight.setAttribute("x", "390"); labelRight.setAttribute("y", "172");
    labelRight.classList.add("nw-axis-text");
    labelRight.setAttribute("text-anchor", "end");
    labelRight.textContent = formatShortDate(maxX);
    svg.appendChild(labelRight);

    svg.__pointsData = pointsData;
    return svg;
}

/**
 * LISTENERS VINCULADOS DIRETAMENTE AO SVG
 * Quando o SVG é destruído/substituído pelo DOM, o Garbage Collector descarta todos os listeners automaticamente.
 */
function bindChartInteractivity(svg, nwData, state) {
    if (!svg || !svg.__pointsData) return;
    const pointsData = svg.__pointsData;
    const crosshair = svg.querySelector('#nw-crosshair');
    const circles = svg.querySelectorAll('.nw-point');
    const totalDisplay = document.getElementById('nw-display-total');
    const labelDisplay = document.getElementById('nw-label-date');
    const locale = navigator.language.startsWith('pt') ? 'pt-BR' : 'es-ES';
    const defaultTotal = formatCurrency(nwData.totalCents, state.monedaActual);
    const defaultLabelText = t('nwTotalLabel') || "Patrimonio Total";
    let activePointIndex = -1;

    const handleMove = (e) => {
        if (e.cancelable) e.preventDefault();
        svg.classList.add('scrubbing');
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = svg.getBoundingClientRect();
        const xInSVG = ((clientX - rect.left) / rect.width) * 400;
        let closest = pointsData[0];
        let minDx = Math.abs(xInSVG - closest.x);
        let closestIdx = 0;

        pointsData.forEach((p, i) => {
            const dx = Math.abs(xInSVG - p.x);
            if (dx < minDx) {
                minDx = dx;
                closest = p;
                closestIdx = i;
            }
        });

        if (activePointIndex !== closestIdx) {
            activePointIndex = closestIdx;
            crosshair.setAttribute("x1", closest.x);
            crosshair.setAttribute("x2", closest.x);
            circles.forEach(c => c.classList.remove('nw-active-point'));
            circles[closestIdx].classList.add('nw-active-point');
            totalDisplay.innerText = formatCurrency(closest.value, state.monedaActual);
            labelDisplay.innerText = new Date(closest.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
            if (navigator.vibrate) navigator.vibrate(10);
        }
    };

    const handleEnd = () => {
        svg.classList.remove('scrubbing');
        circles.forEach(c => c.classList.remove('nw-active-point'));
        activePointIndex = -1;
        totalDisplay.innerText = defaultTotal;
        labelDisplay.innerText = defaultLabelText;
    };

    svg.addEventListener('pointerdown', handleMove);
    svg.addEventListener('pointermove', (e) => {
        if (e.buttons > 0 || e.touches) handleMove(e);
    });
    svg.addEventListener('pointerup', handleEnd);
    svg.addEventListener('pointerleave', handleEnd);
    svg.addEventListener('pointercancel', handleEnd);

    svg.addEventListener('touchstart', handleMove, { passive: false });
    svg.addEventListener('touchmove', handleMove, { passive: false });
    svg.addEventListener('touchend', handleEnd);
}

function renderVaultHistory(state) {
    const historyList = document.getElementById('lista-vault-historial');
    if (!historyList) return;
    historyList.innerHTML = '';
    const records = [...(state.historialPatrimonio || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (records.length === 0) {
        historyList.innerHTML = `<li class="no-expenses-li" style="box-shadow:none; background:transparent;"><div class="text-center text-muted-small py-10">Sem lançamentos.</div></li>`;
        return;
    }
    
    const locale = navigator.language.startsWith('pt') ? 'pt-BR' : 'es-ES';
    records.forEach(r => {
        const cuenta = state.cuentas.find(c => c.id === r.cuentaId);
        const nombreCuenta = cuenta ? cuenta.nombre : 'Ativo Removido';
        const dateStr = new Date(r.fecha).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
        const li = document.createElement('li');
        li.className = 'list-item-flex';
        li.innerHTML = `
            <div class="info">
                <strong style="font-size: 1.05rem;">${escapeHTML(nombreCuenta)}</strong>
                <div class="text-muted-small" style="padding: 0;">${dateStr} &bull; <span style="color: var(--primary-color); font-weight: bold;">${formatCurrency(r.monto, state.monedaActual)}</span></div>
            </div>
            <div class="actions">
                <button type="button" class="btn-eliminar-simple btn-eliminar-vault" data-id="${escapeHTML(String(r.id))}">🗑️</button>
            </div>
        `;
        historyList.appendChild(li);
    });

    // Delegação de evento única para a lista
    if (!historyList.dataset.bound) {
        historyList.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-eliminar-vault');
            if (btn) {
                const id = parseInt(btn.dataset.id, 10);
                if(confirm("Remover este registro de auditoria histórico?")) {
                    state.historialPatrimonio = state.historialPatrimonio.filter(reg => reg.id !== id);
                    saveStore();
                    renderNetWorthSection(state);
                    showToast("🗑️ Registro removido");
                }
            }
        });
        historyList.dataset.bound = 'true';
    }
}

export function renderNetWorthSection(state) {
    const nwData = calculateNetWorth(state);
    const container = document.getElementById('nw-chart-container');
    const select = document.getElementById('input-nw-cuenta');
    if (!container || !select) return;
    
    document.getElementById('nw-display-total').innerText = formatCurrency(nwData.totalCents, state.monedaActual);
    
    const varEl = document.getElementById('nw-display-variation');
    const signal = nwData.variationCents >= 0 ? '+' : '';
    varEl.innerText = `${signal}${formatCurrency(nwData.variationCents, state.monedaActual)} (${signal}${nwData.pct.toFixed(2)}%)`;
    varEl.className = nwData.variationCents >= 0 ? 'fs-1-1 variation-positive' : 'fs-1-1 variation-negative';
    
    const varLabelEl = document.getElementById('nw-var-label');
    if (varLabelEl) varLabelEl.innerText = nwData.benchmarkLabel;
    
    container.innerHTML = '';
    if (nwData.contasInvestimento.length === 0) {
        container.innerHTML = `<div class="empty-state text-center mt-20"><p class="text-muted-small">${t('nwEmpty')}</p></div>`;
    } else {
        const svgChart = drawSVGChart(nwData.history);
        container.appendChild(svgChart);
        bindChartInteractivity(svgChart, nwData, state);
    }
    
    select.innerHTML = nwData.contasInvestimento.map(c => {
        const labelTipo = c.tipo === 'vault_fixa' ? 'Fixa' : 'Variável';
        return `<option value="${escapeHTML(c.id)}">${escapeHTML(c.nombre)} [${labelTipo}] (Atual: ${formatCurrency(nwData.saldosAtuais[c.id] || 0, state.monedaActual)})</option>`;
    }).join('');

    renderVaultHistory(state);
}

export function initFlouxVault(openModalCallback, closeModalCallback) {
    document.getElementById('btn-abrir-flouxvault')?.addEventListener('click', () => {
        history.pushState({ view: 'flouxvault' }, '');
        openModalCallback();
        renderNetWorthSection(state);
    });

    document.getElementById('btn-cerrar-flouxvault')?.addEventListener('click', closeModalCallback);

    const formNovoAtivo = document.getElementById('form-novo-ativo-vault');
    if (formNovoAtivo && !formNovoAtivo.dataset.bound) {
        formNovoAtivo.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('input-vault-nome').value.trim();
            const tipo = document.getElementById('input-vault-tipo').value;
            
            if (nome) {
                const id = 'vault_' + Date.now();
                state.cuentas = [...state.cuentas, { id, nombre: nome, tipo, cierreTC: null }];
                document.getElementById('input-vault-nome').value = '';
                if (navigator.vibrate) navigator.vibrate(15);
                showToast("✨ Ativo criado com sucesso!");
                saveStore();
                renderNetWorthSection(state);
            }
        });
        formNovoAtivo.dataset.bound = 'true';
    }

    const formVault = document.getElementById('form-flouxvault');
    if (formVault && !formVault.dataset.bound) {
        formVault.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputNwMonto = document.getElementById('input-nw-monto');
            const cuentaId = document.getElementById('input-nw-cuenta').value;
            const montoCents = parseInt(inputNwMonto.dataset.cents || '0', 10);
            
            if (cuentaId && !isNaN(montoCents)) {
                addRegistroPatrimonio({
                    id: Date.now(),
                    cuentaId: cuentaId,
                    monto: montoCents,
                    fecha: new Date().toISOString()
                });
                inputNwMonto.value = '';
                inputNwMonto.dataset.cents = '0';
                if (navigator.vibrate) navigator.vibrate(15);
                showToast("✨ " + t('btnSave'));
                saveStore();
                renderNetWorthSection(state);
            }
        });
        formVault.dataset.bound = 'true';
    }
}