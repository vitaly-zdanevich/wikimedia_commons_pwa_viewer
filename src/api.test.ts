import { describe, expect, it } from 'vitest';
import { apiUrl, normalizeCategory, parseImageDetails, thumbWidth } from './api.ts';

describe('apiUrl', () => {
	it('targets the Commons API with CORS enabled', () => {
		const url = new URL(apiUrl({ action: 'query' }));
		expect(url.origin).toBe('https://commons.wikimedia.org');
		expect(url.pathname).toBe('/w/api.php');
		expect(url.searchParams.get('origin')).toBe('*');
		expect(url.searchParams.get('format')).toBe('json');
		expect(url.searchParams.get('action')).toBe('query');
	});
});

describe('normalizeCategory', () => {
	it('strips the namespace prefix', () => {
		expect(normalizeCategory('Category:Cats')).toBe('Cats');
	});

	it('replaces underscores with spaces', () => {
		expect(normalizeCategory('Category:Black_cats')).toBe('Black cats');
	});

	it('keeps plain names untouched', () => {
		expect(normalizeCategory('Cats')).toBe('Cats');
	});
});

describe('parseImageDetails', () => {
	const main = {
		query: {
			pages: {
				'1': {
					imageinfo: [{
						extmetadata: {
							ImageDescription: { value: 'A black cat' },
							DateTimeOriginal: { value: '2020-01-01' },
							Credit: { value: 'Own work' },
							Artist: { value: '<a href="#">Bob</a>' },
							LicenseShortName: { value: 'CC BY-SA 4.0' },
							LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
						},
					}],
					categories: [{ title: 'Category:Black_cats' }],
				},
			},
		},
	};
	const versions = {
		query: { pages: { '1': { imageinfo: [{}, {}, {}, {}, {}] } } },
	};
	const caption = {
		entities: {
			M1: { labels: { en: { value: 'A cat' }, de: { value: 'Eine Katze' } } },
		},
	};

	it('maps extmetadata fields and counts versions', () => {
		const details = parseImageDetails(main, versions, caption);
		expect(details.description).toBe('A black cat');
		expect(details.date).toBe('2020-01-01');
		expect(details.source).toBe('Own work');
		expect(details.author).toBe('<a href="#">Bob</a>');
		expect(details.license).toBe('CC BY-SA 4.0');
		expect(details.versions).toBe(5);
		expect(details.categories).toEqual(['Black cats']);
		expect(details.caption).toBe('A cat');
	});

	it('picks the caption for the requested language', () => {
		expect(parseImageDetails(main, versions, caption, 'de-DE').caption).toBe('Eine Katze');
	});

	it('handles files with no metadata at all', () => {
		const details = parseImageDetails({}, {}, undefined);
		expect(details.versions).toBe(0);
		expect(details.categories).toEqual([]);
		expect(details.caption).toBeUndefined();
		expect(details.license).toBeUndefined();
	});
});

describe('thumbWidth', () => {
	it('picks the smallest bucket covering one column', () => {
		expect(thumbWidth(1, 400)).toBe(640);
	});

	it('halves the needed width for two columns', () => {
		expect(thumbWidth(2, 400)).toBe(320);
	});

	it('caps at the largest bucket', () => {
		expect(thumbWidth(1, 4000)).toBe(1280);
	});
});
