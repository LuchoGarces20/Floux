// js/flouxVision.js
import { state } from './store.js';
import { formatCurrency } from './i18n.js';

let isInitialized = false;

function calcularInteresCompuesto(pCents, tVal, rVal) {
    const rawFutureValue = pCents * Math.pow(1 + (rVal / 100), tVal);
    const futureValueCents = Math.round(Number.isFinite(rawFutureValue) ? rawFutureValue : 0);
    return {
        futureValueCents,
        differenceCents: Math.max(0, futureValueCents - pCents)
    };
}

export function actualizarPerdidaInvisibleUI() {
    const lsimMonto = document.getElementById('input-lsim-monto');
    const sliderAnos = document.getElementById('slider-lsim-anos');
    const sliderTasa = document.getElementById('slider-lsim-tasa');
    if (!lsimMonto || !sliderAnos || !sliderTasa) return;

    const pCents = Math.round((parseFloat(lsimMonto.value) || 0) * 100);
    const tVal = parseFloat(sliderAnos.value);
    const rVal = parseFloat(sliderTasa.value);

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

export function initFlouxVision(closeModalCallback) {
    document.getElementById('btn-cerrar-simulador')?.addEventListener('click', closeModalCallback);

    if (isInitialized) return;
    isInitialized = true;

    const lsimMonto = document.getElementById('input-lsim-monto');
    const sliderAnos = document.getElementById('slider-lsim-anos');
    const sliderTasa = document.getElementById('slider-lsim-tasa');

    [lsimMonto, sliderAnos, sliderTasa].forEach(input => {
        if (input) input.addEventListener('input', actualizarPerdidaInvisibleUI);
    });
}