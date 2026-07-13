import { describe, expect, it } from 'vitest';
import { encodePng, splashAssets } from './splash.ts';

describe('encodePng', () => {
	it('produces a valid PNG signature and IHDR', () => {
		const png = encodePng(2, 1, Uint8Array.from([255, 0, 0, 0, 255, 0]));
		expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		const view = new DataView(png.buffer);
		expect(view.getUint32(16)).toBe(2); // width
		expect(view.getUint32(20)).toBe(1); // height
	});
});

describe('splashAssets', () => {
	it('generates a dark #000 and light variant per profile', () => {
		const assets = splashAssets();
		const dark = assets.filter((a) => a.media.includes('(prefers-color-scheme: dark)'));
		const light = assets.filter((a) => a.media.includes('(prefers-color-scheme: light)'));
		expect(dark.length).toBe(light.length);
		expect(dark.length).toBeGreaterThan(0);
	});

	it('targets each device profile with a full media query', () => {
		for (const asset of splashAssets()) {
			expect(asset.media).toMatch(/device-width: \d+px/);
			expect(asset.media).toMatch(/-webkit-device-pixel-ratio: \d/);
			expect(asset.media).toMatch(/orientation: (portrait|landscape)/);
		}
	});
});
