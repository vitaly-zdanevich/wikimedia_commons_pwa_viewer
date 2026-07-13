import { describe, expect, it } from 'vitest';
import { apiUrl, normalizeCategory, thumbWidth } from './api.ts';

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
