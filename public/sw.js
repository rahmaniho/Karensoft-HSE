const CACHE_PREFIX = "karen-hse";
const CACHE_NAME = `${CACHE_PREFIX}-shell-v2`;
const CORE_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-180.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

async function cacheFile(cache, url) {
  try {
    const response = await fetch(url, { cache: "reload" });
    if (response.ok) await cache.put(url, response);
  } catch {
    // A single optional asset should not prevent the app shell from installing.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const page = await fetch("/index.html", { cache: "reload" });
      if (page.ok) {
        await cache.put("/index.html", page.clone());
        const html = await page.text();
        const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
          .map((match) => new URL(match[1], self.location.origin))
          .filter(
            (url) =>
              url.origin === self.location.origin &&
              (url.pathname.startsWith("/assets/") ||
                /\.(?:js|css)$/.test(url.pathname)),
          )
          .map((url) => url.pathname);
        await Promise.all(
          [...new Set([...CORE_FILES, ...assets])].map((url) =>
            cacheFile(cache, url),
          ),
        );
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put("/index.html", response.clone());
          }
          return response;
        } catch {
          return (
            (await caches.match("/index.html")) ||
            new Response("برنامه در حالت آفلاین در دسترس نیست.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || request.destination) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }
});
