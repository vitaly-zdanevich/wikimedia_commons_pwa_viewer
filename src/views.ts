import type { Image, ImagePage } from './api.ts';
import {
	fetchCategoryImages,
	fetchNearby,
	fetchParentCategories,
	fetchSubcategories,
	searchImages,
	thumbWidth,
} from './api.ts';
import { el, message } from './dom.ts';
import { showImageInfo } from './overlay.ts';
import { getColumns } from './prefs.ts';
import { categoryHash } from './router.ts';

function currentThumbWidth(): number {
	return thumbWidth(getColumns(), window.innerWidth * (window.devicePixelRatio || 1));
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
		img.src = image.thumbUrl;
		img.alt = image.title;
		img.loading = 'lazy';
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
		const link = el('a', 'chip');
		link.href = categoryHash(category);
		link.textContent = category;
		section.append(link);
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
