import { fetchImageDetails, type Image, type ImageDetails } from './api.ts';
import { el } from './dom.ts';
import { categoryHash } from './router.ts';

// Extmetadata values are HTML; the overlay shows plain text.
function htmlToText(html: string): string {
	return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';
}

function row(text: string, label?: string): HTMLElement {
	const p = el('p', 'info-row');
	if (label) {
		const strong = el('strong');
		strong.textContent = `${label}: `;
		p.append(strong);
	}
	p.append(text);
	return p;
}

function externalLink(href: string, text: string, className?: string): HTMLAnchorElement {
	const link = el('a', className);
	link.href = href;
	link.target = '_blank';
	link.rel = 'noopener';
	link.textContent = text;
	return link;
}

function detailRows(details: ImageDetails): HTMLElement[] {
	const rows: HTMLElement[] = [];
	if (details.caption) rows.push(row(details.caption));
	if (details.description) rows.push(row(htmlToText(details.description)));
	if (details.date) rows.push(row(htmlToText(details.date), 'Date'));
	if (details.source) rows.push(row(htmlToText(details.source), 'Source'));
	if (details.author) rows.push(row(htmlToText(details.author), 'Author'));
	if (details.license) {
		const p = el('p', 'info-row');
		p.append(
			details.licenseUrl
				? externalLink(details.licenseUrl, details.license)
				: details.license,
		);
		rows.push(p);
	}
	if (details.versions > 1) rows.push(row(String(details.versions), 'Versions'));
	if (details.usage.length > 0) {
		const section = el('div', 'info-usage');
		const heading = el('p', 'info-row');
		const strong = el('strong');
		strong.textContent = 'Used in:';
		heading.append(strong);
		section.append(heading);
		for (const usage of details.usage) {
			const line = el('p', 'info-row');
			line.append(externalLink(usage.url, usage.title), ` (${usage.lang})`);
			section.append(line);
		}
		rows.push(section);
	}
	if (details.categories.length > 0) {
		const chips = el('nav', 'chips');
		for (const category of details.categories) {
			const link = el('a', 'chip');
			link.href = categoryHash(category);
			link.textContent = category;
			chips.append(link);
		}
		rows.push(chips);
	}
	return rows;
}

export function showImageInfo(image: Image): void {
	const dialog = el('dialog', 'info');
	const body = el('div', 'info-body');
	const status = row('Loading…');
	body.append(
		externalLink(image.pageUrl, image.title.replace(/^File:/, ''), 'info-name'),
		status,
	);
	dialog.append(body);

	// Tapping anything that is not a link closes the overlay.
	dialog.addEventListener('click', (event) => {
		if (!(event.target instanceof HTMLAnchorElement)) dialog.close();
	});
	dialog.addEventListener('close', () => dialog.remove());
	// A tapped category chip navigates; close the overlay with it.
	window.addEventListener('hashchange', () => dialog.close(), { once: true });

	document.body.append(dialog);
	dialog.showModal();

	fetchImageDetails(image.title, navigator.language)
		.then((details) => {
			status.remove();
			body.append(...detailRows(details));
		})
		.catch(() => {
			status.textContent = 'Failed to load details.';
		});
}
