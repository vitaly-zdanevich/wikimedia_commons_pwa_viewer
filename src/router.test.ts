import { describe, expect, it } from 'vitest';
import { categoryHash, nearbyHash, parseHash, searchHash, userHash } from './router.ts';

describe('parseHash', () => {
	it('defaults to home', () => {
		expect(parseHash('')).toEqual({ view: 'home' });
		expect(parseHash('#/')).toEqual({ view: 'home' });
		expect(parseHash('#/nonsense')).toEqual({ view: 'home' });
	});

	it('parses categories, decoding escapes', () => {
		expect(parseHash('#/category/Black%20cats')).toEqual({
			view: 'category',
			category: 'Black cats',
		});
	});

	it('parses search queries', () => {
		expect(parseHash('#/search/sunset')).toEqual({
			view: 'search',
			query: 'sunset',
		});
	});

	it('parses user uploads routes', () => {
		expect(parseHash('#/user/Some%20User')).toEqual({
			view: 'user',
			user: 'Some User',
		});
		expect(parseHash('#/user/')).toEqual({ view: 'home' });
	});

	it('parses nearby coordinates', () => {
		expect(parseHash('#/nearby/52.5,13.4')).toEqual({
			view: 'nearby',
			lat: 52.5,
			lon: 13.4,
		});
	});

	it('rejects malformed coordinates', () => {
		expect(parseHash('#/nearby/oops')).toEqual({ view: 'home' });
	});
});

describe('hash builders round-trip through parseHash', () => {
	it('category', () => {
		expect(parseHash(categoryHash('Black cats'))).toEqual({
			view: 'category',
			category: 'Black cats',
		});
	});

	it('search', () => {
		expect(parseHash(searchHash('sunset over sea'))).toEqual({
			view: 'search',
			query: 'sunset over sea',
		});
	});

	it('user', () => {
		expect(parseHash(userHash('Some User'))).toEqual({
			view: 'user',
			user: 'Some User',
		});
	});

	it('nearby', () => {
		expect(parseHash(nearbyHash(52.52001, 13.40495))).toEqual({
			view: 'nearby',
			lat: 52.52001,
			lon: 13.40495,
		});
	});
});
