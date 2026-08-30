import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Dev-only: bust stale service workers / caches that serve mismatched Vite dep
// chunks (different ?v= hashes), which break React's hook dispatcher
// ("Cannot read properties of null (reading 'useState')"). If anything stale
// is found, clear it and reload once for a clean load.
if (import.meta.env.DEV) {
  (async () => {
    try {
      let needReload = false;
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length || navigator.serviceWorker.controller) needReload = true;
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        if (keys.length) needReload = true;
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if (needReload && !sessionStorage.getItem('dko_cache_busted')) {
        sessionStorage.setItem('dko_cache_busted', '1');
        window.location.reload();
      }
    } catch {}
  })();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)