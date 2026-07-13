import type { Image, ImagePage } from './api.ts';
import {
	fetchCategoryImages,
	fetchNearby,
	fetchParentCategories,
	fetchSubcategories,
	fetchUserImages,
	imageFromCachedUrl,
	searchImages,
	thumbWidth,
} from './api.ts';
import { IMAGE_CACHE } from './cache-names.ts';
import { categoryChip, el, message } from './dom.ts';
import { showImageInfo } from './overlay.ts';
import { getColumns } from './prefs.ts';

function currentThumbWidth(): number {
	// Cap the density multiplier: on DPR-3 phones full-density thumbs
	// exceed iOS Safari's decoded-image memory budget and WebKit
	// renders black tiles instead of some images.
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	return thumbWidth(getColumns(), window.innerWidth * dpr);
}

function renderImages(grid: HTMLElement, images: Image[]): void {
	for (const image of images) {
		const link = el('a');
		link.href = image.pageUrl;
		link.addEventListener('click', (event) => {
			event.preventDefault();
			showImageInfo(image, link);
		});
		const img = el('img');
		// CORS mode gives the service worker real (cacheable) responses
		// instead of opaque ones; upload.wikimedia.org sends ACAO: *.
		img.crossOrigin = 'anonymous';
		img.src = image.thumbUrl;
		img.alt = image.title;
		img.loading = 'lazy';
		img.decoding = 'async';
		link.append(img);
		grid.append(link);
	}
}

// Gapless image grid with infinite scroll.
function imageFeed(
	root: HTMLElement,
	load: (cont?: string) => Promise<ImagePage>,
): void {
	const grid = el('div', 'grid');
	const sentinel = el('div', 'sentinel');
	root.append(grid, sentinel);

	let cont: string | undefined;
	let done = false;
	let loading = false;

	async function loadMore(): Promise<void> {
		if (done || loading) return;
		loading = true;
		try {
			const page = await load(cont);
			renderImages(grid, page.images);
			cont = page.continueToken;
			done = !cont;
			if (grid.childElementCount === 0 && done) {
				root.append(message('No images.'));
			}
		} catch {
			done = true;
			root.append(message('Failed to load images.'));
		} finally {
			loading = false;
			if (done) observer.disconnect();
		}
	}

	const observer = new IntersectionObserver((entries) => {
		if (entries.some((e) => e.isIntersecting)) void loadMore();
	}, { rootMargin: '1000px' });
	observer.observe(sentinel);
	void loadMore();
}

function categoryChips(
	root: HTMLElement,
	label: string,
	categories: string[],
): void {
	if (categories.length === 0) return;
	const section = el('nav', 'chips');
	const caption = el('span', 'chips-label');
	caption.textContent = label;
	section.append(caption);
	for (const category of categories) {
		section.append(categoryChip(category));
	}
	root.append(section);
}

const HOME_CATEGORY = 'Featured pictures on Wikimedia Commons';

export function renderHome(root: HTMLElement): void {
	imageFeed(root, (cont) =>
		fetchCategoryImages(HOME_CATEGORY, currentThumbWidth(), cont));
}

export async function renderCategory(root: HTMLElement, category: string): Promise<void> {
	document.title = category;
	const chipsRoot = el('div');
	root.append(chipsRoot);
	imageFeed(root, (cont) =>
		fetchCategoryImages(category, currentThumbWidth(), cont));
	const [parents, subcats] = await Promise.all([
		fetchParentCategories(category).catch(() => []),
		fetchSubcategories(category).catch(() => []),
	]);
	categoryChips(chipsRoot, '↑', parents);
	categoryChips(chipsRoot, '↓', subcats);
}

export function renderUser(root: HTMLElement, user: string): void {
	document.title = user;
	imageFeed(root, (cont) => fetchUserImages(user, currentThumbWidth(), cont));
}

// Offline grid of the images already in the service worker cache.
export async function renderCached(root: HTMLElement): Promise<void> {
	document.title = 'Cached';
	const cache = await caches.open(IMAGE_CACHE);
	const keys = await cache.keys();
	// One entry per file; prefer the thumbnail over the original.
	const byTitle = new Map<string, Image>();
	for (const request of keys) {
		const image = imageFromCachedUrl(request.url);
		if (!image) continue;
		const existing = byTitle.get(image.title);
		if (!existing || (!existing.thumbUrl.includes('/thumb/') && image.thumbUrl.includes('/thumb/'))) {
			byTitle.set(image.title, image);
		}
	}
	const images = [...byTitle.values()];
	if (images.length === 0) {
		root.append(message('No cached images yet.'));
		return;
	}
	const grid = el('div', 'grid');
	root.append(grid);
	renderImages(grid, images);
}

export function renderSearch(root: HTMLElement, query: string): void {
	document.title = query;
	imageFeed(root, (cont) => searchImages(query, currentThumbWidth(), cont));
}

export async function renderNearby(root: HTMLElement, lat: number, lon: number): Promise<void> {
	document.title = 'Nearby';
	const status = el('p', 'empty');
	status.textContent = 'Looking around…';
	root.append(status);
	try {
		const nearby = await fetchNearby(lat, lon, currentThumbWidth());
		status.remove();
		categoryChips(root, '📍', nearby.categories);
		const grid = el('div', 'grid');
		root.append(grid);
		renderImages(grid, nearby.images);
		if (nearby.images.length === 0 && nearby.categories.length === 0) {
			root.append(message('Nothing found nearby.'));
		}
	} catch {
		status.textContent = 'Failed to load nearby results.';
	}
}
