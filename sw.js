// Energization One-Line service worker: keeps the app working with no signal.
const VERSION = 'eol-2026.10.17.2-1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-32.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const PDFJS = ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'];
const RUNTIME = 'eol-runtime';
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION); await c.addAll(CORE);
    // Pre-fetch the PDF reader so uploading a PDF works offline too (best effort).
    try { const r = await caches.open(RUNTIME); await Promise.all(PDFJS.map(async u => { if (!(await r.match(u))) { const res = await fetch(u, {mode: 'no-cors'}); await r.put(u, res); } })); } catch (err) {}
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('eol-') && k !== VERSION && k !== RUNTIME) await caches.delete(k); await self.clients.claim(); })());
});
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // Fresh copy when the signal is good; the cached app instantly when it isn't.
      e.respondWith((async () => { const c = await caches.open(VERSION); try { const r = await timeout(fetch(req), 3500); if (r.ok) c.put('./index.html', r.clone()); return r; } catch { return (await c.match('./index.html')) || (await c.match('./')) || Response.error(); } })());
      return;
    }
    e.respondWith((async () => { const c = await caches.open(VERSION); const hit = await c.match(req, {ignoreSearch: true}); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; })());
    return;
  }
  if (/(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => { const c = await caches.open(RUNTIME); const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })());
  }
});
