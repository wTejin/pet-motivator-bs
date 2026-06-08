// 星宠契约 Service Worker
const CACHE_NAME = 'xingchong-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

// 安装：预缓存核心静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] 预缓存部分资源失败:', err)
      })
    })
  )
  // 立即激活，不等待旧 SW
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  // 立即接管所有页面
  self.clients.claim()
})

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和 API 请求
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) {
    // API 请求：网络优先，不缓存
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // 后台更新缓存
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response)
              })
            }
          })
          .catch(() => {})
        return cached
      }
      return fetch(event.request)
        .then((response) => {
          if (!response.ok) return response
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned)
          })
          return response
        })
        .catch(() => {
          // 离线回退：返回缓存首页
          return caches.match('/')
        })
    })
  )
})
