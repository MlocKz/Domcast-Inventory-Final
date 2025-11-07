import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Error boundary for production - log errors but don't break the app
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Don't replace the root - let React handle it
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('main.tsx executing - React is loading');

// Add a timeout to show error if React doesn't mount
const mountTimeout = setTimeout(() => {
  const root = document.getElementById('root');
  if (root && root.innerHTML.includes('Loading DomCast')) {
    console.error('React failed to mount after 3 seconds');
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; background: #000; color: #fff;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Application Failed to Load</h1>
        <p style="color: #ccc; margin-bottom: 16px;">React did not mount. Check browser console (F12) for errors.</p>
        <p style="color: #999; font-size: 12px; margin-bottom: 16px;">If JavaScript files are not loading, check Netlify build logs.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}, 3000);

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('Root element found, rendering React app');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('React app rendered successfully');
  clearTimeout(mountTimeout);
} catch (error) {
  clearTimeout(mountTimeout);
  console.error('Failed to render app:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; background: #000; color: #fff;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to Load Application</h1>
        <p style="color: #ccc; margin-bottom: 16px;">${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p style="color: #999; font-size: 12px; margin-bottom: 16px;">Check the browser console (F12) for more details</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}