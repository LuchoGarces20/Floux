import { state, saveStore, addRegistroPatrimonio } from './store.js';
import { t, formatCurrency } from './i18n.js';
import { calculateNetWorth } from './financeEngine.js';
import { escapeHTML, showToast } from './ui.js';

function drawSVGChart(dataPoints) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 400 160");
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
    const getX = (date) => ((date - minX) / xRange) * 390 + 5;
    const getY = (val) => 150 - (((val - yMin) / yRange) * 140);
    
    let polylinePoints = "";
    const frag = document.createDocumentFragment();
    
    dataPoints.forEach((dp, index) => {
        const x = getX(dp.date);
        const y = getY(dp.value);
        polylinePoints += `${x},${y} `;
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "4");
        circle.classList.add("nw-point");
        if (index === dataPoints.length - 1) circle.classList.add("nw-point-newest");
        frag.appendChild(circle);
    });
    
    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("points", polylinePoints.trim());
    polyline.classList.add("nw-line");
    
    svg.appendChild(polyline);
    svg.appendChild(frag);
    return svg;
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
    
    container.innerHTML = '';
    if (nwData.contasInvestimento.length === 0) {
        container.innerHTML = `<div class="empty-state text-center mt-20"><p class="text-muted-small">${t('nwEmpty')}</p></div>`;
    } else {
        container.appendChild(drawSVGChart(nwData.history));
    }
    
    select.innerHTML = nwData.contasInvestimento.map(c => {
        const labelTipo = c.tipo === 'vault_fixa' ? 'Fixa' : 'Variável';
        return `<option value="${c.id}">${escapeHTML(c.nombre)} [${labelTipo}] (Atual: ${formatCurrency(nwData.saldosAtuais[c.id] || 0, state.monedaActual)})</option>`;
    }).join('');
}

export function initFlouxVault(openModalCallback, closeModalCallback) {
    // Abrir o FlouxVault
    document.getElementById('btn-abrir-flouxvault').addEventListener('click', () => {
        history.pushState({ view: 'flouxvault' }, '');
        openModalCallback();
        renderNetWorthSection(state); // Renderiza apenas quando aberto!
    });

    // Fechar o FlouxVault
    document.getElementById('btn-cerrar-flouxvault').addEventListener('click', closeModalCallback);
// Formulário para Criar Novo Ativo no Vault
    const formNovoAtivo = document.getElementById('form-novo-ativo-vault');
    if (formNovoAtivo) {
        formNovoAtivo.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('input-vault-nome').value.trim();
            const tipo = document.getElementById('input-vault-tipo').value;
            
            if (nome) {
                const id = 'vault_' + Date.now();
                
                // Adiciona o novo ativo de forma isolada no estado
                state.cuentas = [...state.cuentas, { 
                    id, 
                    nombre: nome, 
                    tipo: tipo, 
                    cierreTC: null 
                }];
                
                document.getElementById('input-vault-nome').value = '';
                
                if (navigator.vibrate) navigator.vibrate(15);
                showToast("✅ Ativo criado com sucesso!");
                
                saveStore();
                renderNetWorthSection(state); // Atualiza os menus suspensos
            }
        });
    }
    // Formulario de Atualização de Saldo
    const formVault = document.getElementById('form-flouxvault');
    if (formVault) {
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
                showToast("✅ " + t('btnSave'));
                
                saveStore();
                renderNetWorthSection(state);
            }
        });
    }
}