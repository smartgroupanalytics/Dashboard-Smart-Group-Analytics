import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { sgfBridge } from './smartgroup-bridge.js';

// Inicializacao assíncrona dentro de uma função, compatível com o build padrão do Vite.
async function iniciarRadar() {
  try {
    await sgfBridge.init();
    createRoot(document.getElementById('root')).render(
      <React.StrictMode><App /></React.StrictMode>
    );
    document.documentElement.style.visibility = 'visible';
  } catch (error) {
    console.error('Falha na autenticação ou no acesso ao Radar de Compras:', error);
    document.getElementById('root').textContent =
      'Não foi possível validar seu acesso ao Radar de Compras. Recarregue ou entre em contato com o TI.';
    document.documentElement.style.visibility = 'visible';
  }
}

iniciarRadar();
