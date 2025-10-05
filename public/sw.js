// 空的、不快取的 Service Worker（只安裝與啟用，無 fetch 攔截）
self.addEventListener('install', () => {
	try { self.skipWaiting() } catch {}
})

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => { try { await self.clients.claim() } catch {} })())
})



