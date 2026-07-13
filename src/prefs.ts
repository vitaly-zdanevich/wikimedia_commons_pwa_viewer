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

const USER_KEY = 'username';

export function getUsername(storage: StorageLike = localStorage): string {
	return storage.getItem(USER_KEY) ?? '';
}

export function setUsername(name: string, storage: StorageLike = localStorage): void {
	storage.setItem(USER_KEY, name);
}
