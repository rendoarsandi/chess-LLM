import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global error handler for mobile debugging
window.onerror = function(message, source, lineno, colno) {
  const msg = message.toString();
  // Ignore the "unreachable" error from Stockfish if it's not actually crashing the app
  if (msg.includes('RuntimeError: unreachable') || msg.includes('stockfish.wasm')) {
    console.warn('Suppressed non-fatal Stockfish error:', msg);
    return true; // Prevents the error from showing the default alert/log
  }
  
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
