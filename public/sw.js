// Minimal Service Worker: install/activate only, no fetch handler
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

// 空的、不快取的 Service Worker（只負責安裝/啟用事件記錄）
self.addEventListener('install', (event) => {
  // 不做任何快取，立即完成
  // 不 skipWaiting，避免切換中版本不一致
})

self.addEventListener('activate', (event) => {
  // 清理策略交由未來版本處理；目前不保留任何快取
})

self.addEventListener('fetch', (event) => {
  // 全部直通網路，不攔截不快取
  return
})



