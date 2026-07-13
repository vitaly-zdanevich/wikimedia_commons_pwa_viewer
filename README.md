# wikimedia_commons_pwa_viewer

A minimal PWA for browsing [Wikimedia Commons](https://commons.wikimedia.org/) images.

- Gapless image feed: one image per line, or two via preferences (⚙)
- Category browsing with parent (↑) and child (↓) categories
- Full-text image search with category autocompletion
- 📍 nearby: closest categories and images via geolocation
- Offline: service worker caches the app shell, API responses and images
- Automatic dark (#000) / light theme via `prefers-color-scheme`, including the iOS splash screen

Client-side only — talks directly to the Commons API (`origin=*` CORS), no backend.

## Development

```sh
npm install
npm run dev    # dev server
npm run lint   # eslint
npm test       # vitest
npm run build  # type-check + production build to dist/
```

## Deployment

GitHub Actions lints, tests, builds and deploys `dist/` to GitHub Pages on every
push to `main` (repository Settings → Pages → Source: GitHub Actions).
