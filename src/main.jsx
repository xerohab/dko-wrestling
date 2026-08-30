import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Dev-only: unregister stale service workers and clear stale caches.
// A cache-first service worker can serve mismatched Vite dep chunks (different
// ?v= hashes) which breaks React's hook dispatcher ("Cannot read properties of
// null (reading 'useState')"). This forces fresh chunks on each dev load.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(r => r.unregister()))
    .catch(() => {});
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)