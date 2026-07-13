import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	fetchCategoryImages,
	fetchNearby,
	fetchParentCategories,
	fetchSubcategories,
	fetchUserImages,
	searchImages,
	suggestCategories,
} from './api.ts';

// Stubs fetch to serve canned JSON bodies in order and records the
// requested URLs so tests can assert the query parameters.
function mockFetch(...bodies: unknown[]): URL[] {
	const urls: URL[] = [];
	const queue = [...bodies];
	vi.stubGlobal('fetch', vi.fn(async (input: string) => {
		urls.push(new URL(input));
		return { ok: true, json: async () => queue.shift() ?? {} };
	}));
	return urls;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

function filePage(title: string, index: number, withThumb = true) {
	return {
		title,
		index,
		imageinfo: withThumb
			? [{
				thumburl: `https://upload.wikimedia.org/thumb/${index}.jpg`,
				url: `https://upload.wikimedia.org/orig/${index}.jpg`,
				descriptionurl: `https://commons.wikimedia.org/wiki/${title}`,
			}]
			: undefined,
	};
}

describe('fetchCategoryImages', () => {
	it('queries category members as files at the requested width', async () => {
		const urls = mockFetch({});
		await fetchCategoryImages('Black_cats', 640);
		const params = urls[0].searchParams;
		expect(params.get('generator')).toBe('categorymembers');
		expect(params.get('gcmtitle')).toBe('Category:Black cats');
		expect(params.get('gcmtype')).toBe('file');
		expect(params.get('iiurlwidth')).toBe('640');
		expect(params.get('gcmcontinue')).toBeNull();
	});

	it('orders results by index and skips entries without a thumbnail', async () => {
		mockFetch({
			query: {
				pages: {
					'10': filePage('File:Second.jpg', 2),
					'11': filePage('File:First.jpg', 1),
					'12': filePage('File:Broken.webm', 3, false),
				},
			},
			continue: { gcmcontinue: 'NEXT' },
		});
		const result = await fetchCategoryImages('Cats', 640);
		expect(result.images.map((i) => i.title)).toEqual(['File:First.jpg', 'File:Second.jpg']);
		expect(result.images[0].thumbUrl).toContain('/thumb/1.jpg');
		expect(result.images[0].originalUrl).toContain('/orig/1.jpg');
		expect(result.continueToken).toBe('NEXT');
	});

	it('passes the continuation token back as gcmcontinue', async () => {
		const urls = mockFetch({});
		await fetchCategoryImages('Cats', 640, 'TOKEN');
		expect(urls[0].searchParams.get('gcmcontinue')).toBe('TOKEN');
	});

	it('rejects on an HTTP error', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
		await expect(fetchCategoryImages('Cats', 640)).rejects.toThrow('500');
	});
});

describe('searchImages', () => {
	it('searches the file namespace and continues via gsroffset', async () => {
		const urls = mockFetch({ query: { pages: {} }, continue: { gsroffset: 50 } });
		const result = await searchImages('sunset', 800);
		const params = urls[0].searchParams;
		expect(params.get('generator')).toBe('search');
		expect(params.get('gsrsearch')).toBe('sunset');
		expect(params.get('gsrnamespace')).toBe('6');
		expect(result.continueToken).toBe(50);

		const urls2 = mockFetch({});
		await searchImages('sunset', 800, result.continueToken);
		expect(urls2[0].searchParams.get('gsroffset')).toBe('50');
	});
});

describe('fetchUserImages', () => {
	it('lists uploads by user, newest first, continuing via gaicontinue', async () => {
		const urls = mockFetch({ continue: { gaicontinue: 'MORE' } });
		const result = await fetchUserImages('Some User', 800);
		const params = urls[0].searchParams;
		expect(params.get('generator')).toBe('allimages');
		expect(params.get('gaiuser')).toBe('Some User');
		expect(params.get('gaisort')).toBe('timestamp');
		expect(params.get('gaidir')).toBe('descending');
		expect(result.continueToken).toBe('MORE');

		const urls2 = mockFetch({});
		await fetchUserImages('Some User', 800, 'MORE');
		expect(urls2[0].searchParams.get('gaicontinue')).toBe('MORE');
	});
});

describe('fetchSubcategories', () => {
	it('lists subcategories with normalized names', async () => {
		const urls = mockFetch({
			query: { categorymembers: [{ title: 'Category:Black_cats' }, { title: 'Category:White cats' }] },
		});
		const subcats = await fetchSubcategories('Cats');
		expect(urls[0].searchParams.get('cmtitle')).toBe('Category:Cats');
		expect(urls[0].searchParams.get('cmtype')).toBe('subcat');
		expect(subcats).toEqual(['Black cats', 'White cats']);
	});
});

describe('fetchParentCategories', () => {
	it('lists visible parent categories with normalized names', async () => {
		const urls = mockFetch({
			query: { pages: { '1': { categories: [{ title: 'Category:Animals' }] } } },
		});
		const parents = await fetchParentCategories('Cats');
		expect(urls[0].searchParams.get('titles')).toBe('Category:Cats');
		expect(urls[0].searchParams.get('clshow')).toBe('!hidden');
		expect(parents).toEqual(['Animals']);
	});
});

describe('suggestCategories', () => {
	it('does not hit the network for a blank prefix', async () => {
		const urls = mockFetch();
		expect(await suggestCategories('  ')).toEqual([]);
		expect(urls).toHaveLength(0);
	});

	it('prefix-searches the category namespace', async () => {
		const urls = mockFetch({
			query: { prefixsearch: [{ title: 'Category:Black_cats' }] },
		});
		const suggestions = await suggestCategories('Black');
		expect(urls[0].searchParams.get('list')).toBe('prefixsearch');
		expect(urls[0].searchParams.get('psnamespace')).toBe('14');
		expect(suggestions).toEqual(['Black cats']);
	});
});

describe('fetchNearby', () => {
	it('geosearches categories and files around the coordinate', async () => {
		const urls = mockFetch(
			{ query: { geosearch: [{ title: 'Category:Minsk' }] } },
			{ query: { pages: { '1': filePage('File:Minsk.jpg', 1) } } },
		);
		const nearby = await fetchNearby(53.9, 27.56, 800);
		expect(urls[0].searchParams.get('list')).toBe('geosearch');
		expect(urls[0].searchParams.get('gscoord')).toBe('53.9|27.56');
		expect(urls[0].searchParams.get('gsnamespace')).toBe('14');
		expect(urls[1].searchParams.get('generator')).toBe('geosearch');
		expect(urls[1].searchParams.get('ggsnamespace')).toBe('6');
		expect(nearby.categories).toEqual(['Minsk']);
		expect(nearby.images.map((i) => i.title)).toEqual(['File:Minsk.jpg']);
	});
});
