import { defineConfig, type Plugin } from 'vitest/config';
import { appleTouchIcon, splashAssets } from './scripts/splash.ts';

// Emits iOS splash screens (light/dark via prefers-color-scheme) and the
// apple-touch-icon, and injects the matching <link> tags into index.html.
function iosSplash(): Plugin {
	let base = '/';
	return {
		name: 'ios-splash',
		configResolved(config) {
			base = config.base;
		},
		transformIndexHtml() {
			return [
				{
					tag: 'link',
					attrs: { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` },
					injectTo: 'head' as const,
				},
				...splashAssets().map((asset) => ({
					tag: 'link',
					attrs: {
						rel: 'apple-touch-startup-image',
						media: asset.media,
						href: `${base}${asset.fileName}`,
					},
					injectTo: 'head' as const,
				})),
			];
		},
		generateBundle() {
			this.emitFile({
				type: 'asset',
				fileName: 'apple-touch-icon.png',
				source: appleTouchIcon(),
			});
			for (const asset of splashAssets()) {
				this.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.png });
			}
		},
	};
}

export default defineConfig({
	base: '/wikimedia_commons_pwa_viewer/',
	plugins: [iosSplash()],
	build: {
		minify: true,
		rollupOptions: {
			input: {
				main: 'index.html',
				sw: 'src/sw.ts',
			},
			output: {
				// The service worker must keep a stable name at the root
				// so registration and updates work across deploys.
				entryFileNames: (chunk) =>
					chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
			},
		},
	},
	test: {
		environment: 'node',
	},
});
