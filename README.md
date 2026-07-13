# wikimedia_commons_pwa_viewer

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=coverage)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=bugs)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Duplicated Lines](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Maintainability](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Reliability](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Security](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=vitaly-zdanevich_wikimedia_commons_pwa_viewer&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=vitaly-zdanevich_wikimedia_commons_pwa_viewer)

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
npm run lint   # eslint
npm test       # vitest
npm run build  # type-check + production build to dist/
```

## Serve locally for testing

```sh
npm run dev
```

Then open http://localhost:5173/wikimedia_commons_pwa_viewer/ — hot reload,
no service worker.

To test the real production build (including the service worker, offline
mode and iOS splash screens):

```sh
npm run build
npm run preview
```

Then open http://localhost:4173/wikimedia_commons_pwa_viewer/.

## Deployment

GitHub Actions lints, tests, builds and deploys `dist/` to GitHub Pages on every
push to `main` (repository Settings → Pages → Source: GitHub Actions).
