// Service worker «Донор-помощника».
// Задача — чтобы сайт открывался и показывал последние данные без интернета.
//
//  • Страница (навигация): сначала сеть, без сети — сохранённая index.html.
//  • Скрипты, стили, иконки, шрифты: из кеша, в фоне обновляются.
//  • GET-запросы к /api/*: сначала сеть, без сети — последний ответ из кеша.
//  • Личный дневник донаций сюда не попадает: он в localStorage и в сеть не уходит.
//  • Не-GET запросы (админские POST/PUT/DELETE) не трогаем вообще.
//
// При изменении логики этого файла увеличьте VERSION — старые кеши удалятся.

const VERSION = 'v1'
const SHELL = `donor-shell-${VERSION}`
const API = `donor-api-${VERSION}`

const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('donor-') && k !== SHELL && k !== API).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL, './index.html'))
    return
  }

  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(req, API))
    return
  }

  const isOwnStatic = url.origin === self.location.origin
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (isOwnStatic || isFont) {
    event.respondWith(staleWhileRevalidate(req, SHELL))
  }
})

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch (err) {
    const cached = (await cache.match(req)) || (fallbackUrl && (await cache.match(fallbackUrl)))
    if (cached) return cached
    throw err
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)
  const network = fetch(req)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone())
      return res
    })
    .catch(() => cached)
  return cached || network
}
