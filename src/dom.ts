import { categoryHash } from './router.ts';

export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className?: string,
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	return node;
}

export function categoryChip(category: string): HTMLAnchorElement {
	const link = el('a', 'chip');
	link.href = categoryHash(category);
	link.textContent = category;
	return link;
}

export function message(text: string): HTMLElement {
	const p = el('p', 'empty');
	p.textContent = text;
	return p;
}
