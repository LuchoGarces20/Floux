import { state } from './store.js';
import { formatCurrency } from './i18n.js';

export function initFlouxVision(openModalCallback, closeModalCallback) {
    const lsimMonto = document.getElementById('input-lsim-monto');
    const sliderAnos = document.getElementById('slider-lsim-anos');
    const sliderTasa = document.getElementById('slider-lsim-tasa');

    // Abre o simulador
    document.getElementById('btn-abrir-simulador').addEventListener('click', () => {
        history.pushState({ view: 'simulador' }, '');
        openModalCallback();
        actualizarPerdidaInvisibleUI();
    });

    // Fecha o simulador
    document.getElementById('btn-cerrar-simulador').addEventListener('click', closeModalCallback);

    // Motor de cálculo de Juros Compostos
    function calcularInteresCompuesto(pCents, tVal, rVal) {
        const futureValueCents = pCents * Math.pow(1 + (rVal / 100), tVal);
        return { futureValueCents, differenceCents: futureValueCents - pCents };
    }

    // Atualização reativa da interface do simulador
    function actualizarPerdidaInvisibleUI() {
        const pCents = Math.round((parseFloat(lsimMonto.value) || 0) * 100);
        const tVal = parseFloat(sliderAnos.value);
        const rVal = parseFloat(sliderTasa.value);
        
        // Estilização dinâmica dos sliders (preenchimento da barra)
        const pAnos = (tVal - sliderAnos.min) / (sliderAnos.max - sliderAnos.min);
        const pTasa = (rVal - sliderTasa.min) / (sliderTasa.max - sliderTasa.min);
        sliderAnos.style.setProperty('--fill', `calc(${pAnos * 100}% + ${16 - (pAnos * 32)}px)`);
        sliderTasa.style.setProperty('--fill', `calc(${pTasa * 100}% + ${16 - (pTasa * 32)}px)`);
        
        document.getElementById('val-anos').innerText = tVal;
        document.getElementById('val-tasa').innerText = rVal.toFixed(1) + '%';
        
        const { futureValueCents, differenceCents } = calcularInteresCompuesto(pCents, tVal, rVal);
        
        document.getElementById('lsim-val-cost').innerText = formatCurrency(pCents, state.monedaActual);
        document.getElementById('display-lsim-resultado').innerText = formatCurrency(futureValueCents, state.monedaActual);
        document.getElementById('lsim-val-diff').innerText = formatCurrency(differenceCents, state.monedaActual);
        
        // Barras de proporção visual
        const barCost = document.getElementById('lsim-bar-cost');
        const barFuture = document.getElementById('lsim-bar-future');
        
        if (futureValueCents > 0) {
            barCost.style.width = `${(pCents / futureValueCents) * 100}%`;
            barFuture.style.width = '100%';
        } else {
            barCost.style.width = '0%';
            barFuture.style.width = '0%';
        }
    }

    // Escutadores de evento para atualização em tempo real
    [lsimMonto, sliderAnos, sliderTasa].forEach(input => {
        input.addEventListener('input', actualizarPerdidaInvisibleUI);
    });
}