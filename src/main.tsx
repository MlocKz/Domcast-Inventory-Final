import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Error boundary for production
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Error Loading Application</h1>
        <p style="color: #666; margin-bottom: 16px;">There was an error loading the application.</p>
        <p style="color: #999; font-size: 14px;">Check the browser console for details.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to Load Application</h1>
        <p style="color: #666; margin-bottom: 16px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}