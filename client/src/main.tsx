import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { DevConsole } from './components/DevConsole'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler for mobile debugging
window.onerror = function(message, source, lineno, colno) {
  const msg = message.toString();
  // Ignore the "unreachable" error from Stockfish if it's not actually crashing the app
  if (msg.includes('RuntimeError: unreachable') || msg.includes('stockfish.wasm')) {
    console.error('CRITICAL: Stockfish engine hit unreachable state:', msg);
    return true; // Prevents the error from showing the default alert/log
  }
  
  console.error(`Error: ${message}\nAt: ${source}:${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = function(event) {
  console.error(`Unhandled Rejection: ${event.reason}`);
};

// Render main app
console.log('[Main] Secure Context:', window.isSecureContext);
console.log('[Main] Cross-Origin Isolated:', window.crossOriginIsolated);
console.log('[Main] SharedArrayBuffer support:', typeof SharedArrayBuffer !== 'undefined');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" expand={false} richColors />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Render DevConsole in a separate root for resilience against main app crashes
const devRoot = document.createElement('div');
devRoot.id = 'dev-root';
document.body.appendChild(devRoot);
createRoot(devRoot).render(<DevConsole />);
