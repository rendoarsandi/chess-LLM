import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { DevConsole } from './components/DevConsole'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler for mobile debugging
window.onerror = function(message, source, lineno, colno) {
  const msg = message.toString();
  // Ignore the "unreachable" error from Stockfish if it's not actually crashing the app
  if (msg.includes('RuntimeError: unreachable') || msg.includes('stockfish.wasm')) {
    console.warn('Suppressed non-fatal Stockfish error:', msg);
    return true; // Prevents the error from showing the default alert/log
  }
  
  console.error(`Error: ${message}\nAt: ${source}:${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = function(event) {
  console.error(`Unhandled Rejection: ${event.reason}`);
};

// Render main app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Render DevConsole in a separate root for resilience against main app crashes
const devRoot = document.createElement('div');
devRoot.id = 'dev-root';
document.body.appendChild(devRoot);
createRoot(devRoot).render(<DevConsole />);
