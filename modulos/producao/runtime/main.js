import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';

import { installAnalyticsDb } from '@/runtime/analyticsDb.js';
installAnalyticsDb();
import('@/App.jsx').then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
}).catch((error) => {
    console.error('Falha ao iniciar o módulo Produção:', error);
    document.getElementById('root').innerHTML = `<div style="font-family:Arial;padding:32px"><h2>Não foi possível abrir Produção</h2><pre>${String(error?.message || error)}</pre></div>`;
});
