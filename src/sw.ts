/// <reference lib="webworker" />
import { API_CACHE, IMAGE_CACHE, STATIC_CACHE } from './cache-names.ts';

const sw = self as unknown as ServiceWorkerGlobalScope;
const KNOWN_CACHES = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
const MAX_IMAGES = 1000;
const MAX_API_RESPONSES = 500;

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(STATIC_CACHE)
			.then((cache) => cache.addAll([sw.registration.scope]))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(
				keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k)),
			))
			.then(() => sw.clients.claim()),
	);
});

async function trimCache(name: string, max: number): Promise<void> {
	const cache = await caches.open(name);
	const keys = await cache.keys();
	for (const key of keys.slice(0, Math.max(0, keys.length - max))) {
		await cache.delete(key);
	}
}

// Images never change on Commons (uploads are immutable): cache-first.
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	// Opaque responses (no-cors image loads) report ok=false but are
	// still valid image bytes worth caching.
	if (response.ok || response.type === 'opaque') {
		const cache = await caches.open(cacheName);
		await cache.put(request, response.clone());
		void trimCache(cacheName, MAX_IMAGES);
	}
	return response;
}

// API and app shell: prefer fresh data, fall back to cache offline.
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	try {
		const response = await fetch(request);
		if (response.ok) {
			await cache.put(request, response.clone());
			if (cacheName === API_CACHE) void trimCache(cacheName, MAX_API_RESPONSES);
		}
		return response;
	} catch (err) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw err;
	}
}

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.hostname === 'upload.wikimedia.org') {
		event.respondWith(cacheFirst(request, IMAGE_CACHE));
	} else if (url.hostname === 'commons.wikimedia.org') {
		event.respondWith(networkFirst(request, API_CACHE));
	} else if (url.origin === sw.location.origin) {
		if (request.mode === 'navigate') {
			// Hash routing: every navigation serves the app shell.
			event.respondWith(networkFirst(new Request(sw.registration.scope), STATIC_CACHE));
		} else {
			event.respondWith(networkFirst(request, STATIC_CACHE));
		}
	}
});
