import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('[DEBUG] main.tsx loaded');
console.log('[DEBUG] window.vscodeApi:', typeof window.vscodeApi);

const rootElement = document.getElementById('root');
console.log('[DEBUG] root element:', rootElement);

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('[DEBUG] React app rendered');
} else {
  console.error('[DEBUG] Root element not found!');
}
