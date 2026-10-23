// Smart Group Analytics — navegação local de Compras e Suprimentos.
// Injetado ao lado do layout da Previsão; não altera compras-app.js nem seus cálculos.
(() => {
  'use strict';
  const tabs = [...document.querySelectorAll('[data-sg-compras-tab]')];
  const forecast = document.getElementById('sg-previsao-conteudo');
  const suppliers = document.getElementById('sg-fornecedores-conteudo');
  const iframe = document.getElementById('sg-fornecedores-frame');
  if (!tabs.length || !forecast || !suppliers || !iframe) return;
  const activate = target => {
    const showSuppliers = target === 'fornecedores';
    forecast.hidden = showSuppliers;
    suppliers.hidden = !showSuppliers;
    tabs.forEach(button => {
      const active = button.dataset.sgComprasTab === target;
      button.classList.toggle('sg-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    // Inicia o módulo de fornecedores só quando aberto, sem impactar a Previsão.
    if (showSuppliers && !iframe.getAttribute('src')) {
      iframe.src = iframe.dataset.src;
    }
    if (showSuppliers) window.scrollTo({top:0,behavior:'auto'});
    else requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  };
  tabs.forEach(button => button.addEventListener('click', () => activate(button.dataset.sgComprasTab)));
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.source !== iframe.contentWindow) return;
    if (event.data?.type !== 'sgf:height') return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 0) iframe.style.height = `${Math.min(20000,Math.max(700,height))}px`;
  });
  activate('previsao');
})();
