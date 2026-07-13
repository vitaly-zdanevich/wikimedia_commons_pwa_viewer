import { describe, expect, it } from 'vitest';
import { getColumns, setColumns } from './prefs.ts';

function fakeStorage(): Storage {
	const data = new Map<string, string>();
	return {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value),
		removeItem: (key) => void data.delete(key),
		clear: () => data.clear(),
		key: () => null,
		get length() {
			return data.size;
		},
	};
}

describe('columns preference', () => {
	it('defaults to one image per line', () => {
		expect(getColumns(fakeStorage())).toBe(1);
	});

	it('persists two images per line', () => {
		const storage = fakeStorage();
		setColumns(2, storage);
		expect(getColumns(storage)).toBe(2);
	});

	it('falls back to one on garbage values', () => {
		const storage = fakeStorage();
		storage.setItem('columns', 'lots');
		expect(getColumns(storage)).toBe(1);
	});
});
