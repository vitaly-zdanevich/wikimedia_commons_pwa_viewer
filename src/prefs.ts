export type Columns = 1 | 2;

const KEY = 'columns';

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function getColumns(storage: StorageLike = localStorage): Columns {
	return storage.getItem(KEY) === '2' ? 2 : 1;
}

export function setColumns(columns: Columns, storage: StorageLike = localStorage): void {
	storage.setItem(KEY, String(columns));
}
