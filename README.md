# Kleinlaut

React site built with Vite, React Router, and Tailwind CSS.

## Development

Use Node.js 24 LTS with npm.

```sh
npm ci
npm run dev
```

## Build and preview

```sh
npm run build
npm run preview
```

The production build is written to `dist/`. The existing Vercel rewrite serves
`index.html` for client-side routes, including direct visits and reloads.

## Browser tests

```sh
npx playwright install chromium
npm test
```

Tests build the production site and check desktop and mobile navigation, direct
routes, the `/drinks` redirect, gallery ordering, scrolling, assets, and contact
links. Third-party requests are stubbed so tests do not depend on Google Maps,
Google Fonts, or the reservation service being available.

## Site structure

- `src/main.jsx` mounts React and the browser router.
- `src/router.jsx` defines the five pages and the `/drinks` redirect.
- `src/components/TopBar.jsx` provides the shared menu/back navigation.
- `src/pages/` contains the home, menu, photos, floor plan, and imprint pages.
- `index.html` retains metadata, favicons, fonts, and the reservation widget.

## Local assets setup

### Fonts
- Put font files in `public/fonts/`.
- Add `@font-face` rules in `src/style.css` (or another imported CSS file).

Example:
```
@font-face {
  font-family: "Your Font";
  src: url("/fonts/YourFont.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Images
You have two common options:

1) Static public assets (no bundling)
- Place files in `public/images/` and reference by absolute path.
- Example in JSX: `<img src="/images/hero.jpg" alt="..." />`

2) Bundled assets (hashed on build)
- Place files in `src/assets/images/` and import them.
- Example in React:
```jsx
import heroImage from '@/assets/images/hero.jpg'

export default function Hero() {
  return <img src={heroImage} alt="..." />
}
```
