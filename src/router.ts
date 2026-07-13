export type Route =
	| { view: 'home' }
	| { view: 'category'; category: string }
	| { view: 'search'; query: string }
	| { view: 'user'; user: string }
	| { view: 'nearby'; lat: number; lon: number };

export function parseHash(hash: string): Route {
	const path = hash.replace(/^#\/?/, '');
	const [head, ...rest] = path.split('/');
	const arg = decodeURIComponent(rest.join('/'));
	switch (head) {
		case 'category':
			if (arg) return { view: 'category', category: arg };
			break;
		case 'search':
			if (arg) return { view: 'search', query: arg };
			break;
		case 'user':
			if (arg) return { view: 'user', user: arg };
			break;
		case 'nearby': {
			const [lat, lon] = arg.split(',').map(Number);
			if (Number.isFinite(lat) && Number.isFinite(lon)) {
				return { view: 'nearby', lat, lon };
			}
			break;
		}
	}
	return { view: 'home' };
}

export function categoryHash(category: string): string {
	return `#/category/${encodeURIComponent(category)}`;
}

export function searchHash(query: string): string {
	return `#/search/${encodeURIComponent(query)}`;
}

export function userHash(user: string): string {
	return `#/user/${encodeURIComponent(user)}`;
}

export function nearbyHash(lat: number, lon: number): string {
	return `#/nearby/${lat.toFixed(5)},${lon.toFixed(5)}`;
}
