/* 旅行予算マネージャー Service Worker
   ※ index.html を更新したら CACHE の数字を必ず上げてください */
const CACHE = 'travel-budget-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

/* インストール：アプリ本体をキャッシュ */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 1件失敗しても全体を止めない
    await Promise.allSettled(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' }))));
  })());
});

/* 有効化：古いキャッシュを削除 */
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 「更新する」ボタンからの指示で即時切替 */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* 為替レートAPI（外部）はキャッシュせずネットワークに任せる。
     オフライン時は取得失敗 → アプリ側でレート手入力にフォールバック */
  if (url.origin !== location.origin) return;

  /* 画面表示：オフラインでも index.html を返す */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match('./index.html')) ||
               (await caches.match('./')) ||
               new Response('オフラインです', {
                 status: 503,
                 headers: { 'Content-Type': 'text/plain; charset=utf-8' }
               });
      }
    })());
    return;
  }

  /* 同一オリジンの静的ファイル：キャッシュ優先＋裏で更新 */
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
