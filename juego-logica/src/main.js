 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Main Entry Point
 * Gesture Lab
 */

import { inject } from '@vercel/analytics';
import { App } from './app';
import './styles/main.css';
import './styles/trust-badge.css';

// Import fonts
import '@fontsource/nunito/200.css';
import '@fontsource/nunito/300.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';

// Initialize Vercel Analytics for deployment tracking
inject();

// Get or create container
const containerElement = document.getElementById('app');

if (!containerElement) {
  throw new Error('Container element #app not found');
}

// Guaranteed non-null after the check above
const container = containerElement;



// Store app instance globally for HMR cleanup
let app = null;

// Cleanup function for HMR
function cleanup() {
  if (app) {
    console.log('[Main] Cleaning up previous app instance...');
    app.dispose();
    app = null;
  }
}

// Create and start application
function initApp() {
  // Cleanup any existing instance first
  cleanup();

  app = new App(container, {
    debug: false, // Set to true for debug panel
  });

  // Start the application
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
  });

  return app;
}

// Initialize the app
initApp();

// Enable keyboard shortcuts
document.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'escape':
      // Clean up on Escape
      _optionalChain([app, 'optionalAccess', _ => _.dispose, 'call', _2 => _2()]);
      break;
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  _optionalChain([app, 'optionalAccess', _3 => _3.dispose, 'call', _4 => _4()]);
});

// Vite HMR support - critical for preventing MediaPipe WASM OOM errors
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('[HMR] Disposing app before hot reload...');
    cleanup();
  });

  import.meta.hot.accept(() => {
    console.log('[HMR] Reinitializing app after hot reload...');
    // The module will be re-executed, which calls initApp()
  });
}

// Export for debugging in console
(window ).app = app;
