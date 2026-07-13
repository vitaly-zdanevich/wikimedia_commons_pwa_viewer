import { suggestCategories } from './api.ts';
import { getColumns, getUsername, setColumns, setUsername, type Columns } from './prefs.ts';
import { categoryHash, nearbyHash, parseHash, searchHash, userHash } from './router.ts';
import { renderCached, renderCategory, renderHome, renderNearby, renderSearch, renderUser } from './views.ts';
import './style.css';

const app = document.querySelector<HTMLElement>('#app')!;
const searchInput = document.querySelector<HTMLInputElement>('#search')!;
const searchForm = document.querySelector<HTMLFormElement>('#search-form')!;
const suggestions = document.querySelector<HTMLElement>('#suggestions')!;
const geoButton = document.querySelector<HTMLButtonElement>('#geo')!;
const prefsButton = document.querySelector<HTMLButtonElement>('#prefs')!;
const prefsDialog = document.querySelector<HTMLDialogElement>('#prefs-dialog')!;
const usernameInput = document.querySelector<HTMLInputElement>('#username')!;
const userLink = document.querySelector<HTMLAnchorElement>('#user-link')!;
const header = document.querySelector('header')!;

function applyColumns(columns: Columns): void {
	document.documentElement.style.setProperty('--cols', String(columns));
}

function render(): void {
	app.replaceChildren();
	suggestions.replaceChildren();
	header.classList.remove('hidden');
	window.scrollTo(0, 0);
	const route = parseHash(location.hash);
	switch (route.view) {
		case 'category':
			void renderCategory(app, route.category);
			break;
		case 'search':
			void renderSearch(app, route.query);
			break;
		case 'user':
			void renderUser(app, route.user);
			break;
		case 'cached':
			void renderCached(app);
			break;
		case 'nearby':
			void renderNearby(app, route.lat, route.lon);
			break;
		default:
			document.title = 'Commons Viewer';
			renderHome(app);
	}
}

// Search: submitting runs a full-text image search; picking a
// suggestion below the input opens that category.
let suggestTimer = 0;
searchInput.addEventListener('input', () => {
	clearTimeout(suggestTimer);
	suggestTimer = window.setTimeout(async () => {
		const text = searchInput.value;
		const categories = await suggestCategories(text).catch(() => []);
		if (searchInput.value !== text) return;
		suggestions.replaceChildren();
		for (const category of categories) {
			const link = document.createElement('a');
			link.href = categoryHash(category);
			link.textContent = category;
			link.addEventListener('click', () => {
				searchInput.value = category;
			});
			suggestions.append(link);
		}
	}, 250);
});

searchForm.addEventListener('submit', (event) => {
	event.preventDefault();
	const query = searchInput.value.trim();
	if (query) location.hash = searchHash(query);
});

geoButton.addEventListener('click', () => {
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			location.hash = nearbyHash(pos.coords.latitude, pos.coords.longitude);
		},
		() => alert('Could not get your location.'),
	);
});

// The saved user name becomes a link to that user's uploads.
function refreshUserLink(): void {
	const name = usernameInput.value.trim();
	userLink.hidden = !name;
	userLink.href = name ? userHash(name) : '#';
	userLink.textContent = name ? `Uploads by ${name}` : '';
}

usernameInput.addEventListener('input', () => {
	setUsername(usernameInput.value.trim());
	refreshUserLink();
});

userLink.addEventListener('click', () => prefsDialog.close());
document.querySelector('#view-cached')!.addEventListener('click', () => prefsDialog.close());

prefsButton.addEventListener('click', () => {
	const checked = prefsDialog.querySelector<HTMLInputElement>(
		`input[value="${getColumns()}"]`,
	);
	if (checked) checked.checked = true;
	usernameInput.value = getUsername();
	refreshUserLink();
	prefsDialog.showModal();
});

prefsDialog.addEventListener('change', (event) => {
	const input = event.target as HTMLInputElement;
	if (input.name === 'columns') {
		const columns: Columns = input.value === '2' ? 2 : 1;
		setColumns(columns);
		applyColumns(columns);
	}
});

prefsDialog.addEventListener('click', (event) => {
	if (event.target === prefsDialog) prefsDialog.close();
});

// Hide the top bar while scrolling down, bring it back on scroll up.
let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
	const y = window.scrollY;
	if (Math.abs(y - lastScrollY) > 4) {
		header.classList.toggle('hidden', y > lastScrollY && y > 60);
		lastScrollY = y;
	}
}, { passive: true });

window.addEventListener('hashchange', render);
applyColumns(getColumns());
render();

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
	void navigator.serviceWorker.register(
		`${import.meta.env.BASE_URL}sw.js`,
		{ type: 'module' },
	);
}
