import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global error handler for mobile debugging
window.onerror = function(message, source, lineno, colno) {
  alert(`Error: ${message}\nAt: ${source}:${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = function(event) {
  alert(`Unhandled Rejection: ${event.reason}`);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
