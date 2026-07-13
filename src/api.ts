const API = 'https://commons.wikimedia.org/w/api.php';

export interface Image {
	title: string;
	thumbUrl: string;
	pageUrl: string;
}

export interface ImagePage {
	images: Image[];
	continueToken?: string;
}

export function apiUrl(params: Record<string, string>): string {
	const url = new URL(API);
	url.search = new URLSearchParams({
		format: 'json',
		origin: '*',
		...params,
	}).toString();
	return url.toString();
}

export function normalizeCategory(title: string): string {
	return title.replace(/^Category:/, '').replace(/_/g, ' ').trim();
}

// Bucket thumbnail widths to a few standard sizes so the same
// thumbnail URL is requested (and cached) across similar screens.
const WIDTH_BUCKETS = [320, 640, 800, 1024, 1280];

export function thumbWidth(columns: number, viewportWidth: number): number {
	const needed = Math.ceil(viewportWidth / columns);
	for (const bucket of WIDTH_BUCKETS) {
		if (bucket >= needed) return bucket;
	}
	return WIDTH_BUCKETS[WIDTH_BUCKETS.length - 1];
}

async function get(params: Record<string, string>): Promise<unknown> {
	const res = await fetch(apiUrl(params));
	if (!res.ok) throw new Error(`Commons API error: ${res.status}`);
	return res.json();
}

interface QueryPage {
	title: string;
	imageinfo?: { thumburl: string; descriptionurl: string }[];
	index?: number;
}

function pagesToImages(data: unknown): Image[] {
	const query = (data as { query?: { pages?: Record<string, QueryPage> } }).query;
	const pages = Object.values(query?.pages ?? {});
	pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
	return pages
		.filter((p) => p.imageinfo?.[0]?.thumburl)
		.map((p) => ({
			title: p.title,
			thumbUrl: p.imageinfo![0].thumburl,
			pageUrl: p.imageinfo![0].descriptionurl,
		}));
}

function continueToken(data: unknown, key: string): string | undefined {
	return (data as { continue?: Record<string, string> }).continue?.[key];
}

export async function fetchCategoryImages(
	category: string,
	width: number,
	cont?: string,
): Promise<ImagePage> {
	const params: Record<string, string> = {
		action: 'query',
		generator: 'categorymembers',
		gcmtitle: `Category:${normalizeCategory(category)}`,
		gcmtype: 'file',
		gcmlimit: '50',
		prop: 'imageinfo',
		iiprop: 'url',
		iiurlwidth: String(width),
	};
	if (cont) params.gcmcontinue = cont;
	const data = await get(params);
	return {
		images: pagesToImages(data),
		continueToken: continueToken(data, 'gcmcontinue'),
	};
}

export async function fetchSubcategories(category: string): Promise<string[]> {
	const data = await get({
		action: 'query',
		list: 'categorymembers',
		cmtitle: `Category:${normalizeCategory(category)}`,
		cmtype: 'subcat',
		cmlimit: '200',
	});
	const members = (data as { query?: { categorymembers?: { title: string }[] } })
		.query?.categorymembers ?? [];
	return members.map((m) => normalizeCategory(m.title));
}

export async function fetchParentCategories(category: string): Promise<string[]> {
	const data = await get({
		action: 'query',
		titles: `Category:${normalizeCategory(category)}`,
		prop: 'categories',
		clshow: '!hidden',
		cllimit: '100',
	});
	const query = (data as { query?: { pages?: Record<string, { categories?: { title: string }[] }> } }).query;
	const page = Object.values(query?.pages ?? {})[0];
	return (page?.categories ?? []).map((c) => normalizeCategory(c.title));
}

export async function suggestCategories(prefix: string): Promise<string[]> {
	if (!prefix.trim()) return [];
	const data = await get({
		action: 'query',
		list: 'prefixsearch',
		pssearch: prefix,
		psnamespace: '14',
		pslimit: '10',
	});
	const results = (data as { query?: { prefixsearch?: { title: string }[] } })
		.query?.prefixsearch ?? [];
	return results.map((r) => normalizeCategory(r.title));
}

export async function searchImages(
	query: string,
	width: number,
	cont?: string,
): Promise<ImagePage> {
	const params: Record<string, string> = {
		action: 'query',
		generator: 'search',
		gsrsearch: query,
		gsrnamespace: '6',
		gsrlimit: '50',
		prop: 'imageinfo',
		iiprop: 'url',
		iiurlwidth: String(width),
	};
	if (cont) params.gsroffset = cont;
	const data = await get(params);
	return {
		images: pagesToImages(data),
		continueToken: continueToken(data, 'gsroffset'),
	};
}

export interface Usage {
	title: string;
	url: string;
	lang: string;
}

export interface ImageDetails {
	caption?: string;
	description?: string;
	date?: string;
	source?: string;
	author?: string;
	license?: string;
	licenseUrl?: string;
	versions: number;
	usage: Usage[];
	categories: string[];
}

interface DetailsPage {
	imageinfo?: { extmetadata?: Record<string, { value?: string }> }[];
	categories?: { title: string }[];
	globalusage?: { title: string; url: string; wiki: string }[];
}

function firstPage(data: unknown): DetailsPage | undefined {
	const query = (data as { query?: { pages?: Record<string, DetailsPage> } }).query;
	return Object.values(query?.pages ?? {})[0];
}

// The three responses come from fetchImageDetails; split out and pure so
// the field mapping is testable without network.
export function parseImageDetails(
	main: unknown,
	versions: unknown,
	caption: unknown,
	lang = 'en',
): ImageDetails {
	const meta = firstPage(main)?.imageinfo?.[0]?.extmetadata ?? {};
	const field = (name: string): string | undefined => meta[name]?.value || undefined;

	const entities = (caption as { entities?: Record<string, { labels?: Record<string, { value?: string }> }> })
		?.entities;
	const labels = Object.values(entities ?? {})[0]?.labels ?? {};
	const captionText =
		labels[lang.split('-')[0]]?.value ?? labels.en?.value ?? Object.values(labels)[0]?.value;

	return {
		caption: captionText,
		description: field('ImageDescription'),
		date: field('DateTimeOriginal'),
		source: field('Credit'),
		author: field('Artist'),
		license: field('LicenseShortName'),
		licenseUrl: field('LicenseUrl'),
		versions: firstPage(versions)?.imageinfo?.length ?? 0,
		usage: (firstPage(main)?.globalusage ?? [])
			.filter((u) => u.wiki.endsWith('.wikipedia.org'))
			.map((u) => ({
				title: u.title.replace(/_/g, ' '),
				url: u.url,
				lang: u.wiki.replace('.wikipedia.org', ''),
			})),
		categories: (firstPage(main)?.categories ?? []).map((c) => normalizeCategory(c.title)),
	};
}

export async function fetchImageDetails(title: string, lang = 'en'): Promise<ImageDetails> {
	const [main, versions, caption] = await Promise.all([
		get({
			action: 'query',
			titles: title,
			prop: 'imageinfo|categories|globalusage',
			iiprop: 'extmetadata',
			clshow: '!hidden',
			cllimit: '100',
			guprop: 'url',
			gulimit: '100',
		}),
		get({
			action: 'query',
			titles: title,
			prop: 'imageinfo',
			iiprop: 'timestamp',
			iilimit: '500',
		}),
		// Structured-data caption; missing entities are not an error.
		get({
			action: 'wbgetentities',
			titles: title,
			sites: 'commonswiki',
			props: 'labels',
		}).catch(() => undefined),
	]);
	return parseImageDetails(main, versions, caption, lang);
}

export interface Nearby {
	categories: string[];
	images: Image[];
}

export async function fetchNearby(
	lat: number,
	lon: number,
	width: number,
): Promise<Nearby> {
	const coord = `${lat}|${lon}`;
	const [catData, imgData] = await Promise.all([
		get({
			action: 'query',
			list: 'geosearch',
			gscoord: coord,
			gsradius: '10000',
			gslimit: '50',
			gsnamespace: '14',
		}),
		get({
			action: 'query',
			generator: 'geosearch',
			ggscoord: coord,
			ggsradius: '10000',
			ggslimit: '50',
			ggsnamespace: '6',
			prop: 'imageinfo',
			iiprop: 'url',
			iiurlwidth: String(width),
		}),
	]);
	const cats = (catData as { query?: { geosearch?: { title: string }[] } })
		.query?.geosearch ?? [];
	return {
		categories: cats.map((c) => normalizeCategory(c.title)),
		images: pagesToImages(imgData),
	};
}
