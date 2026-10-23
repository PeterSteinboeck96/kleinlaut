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
npx playwright install chromium webkit
npm test
```

Tests build the production site and run in Chromium and touch-enabled WebKit.
They cover navigation, direct routes, the `/drinks` redirect, gallery ordering,
scrolling, assets, contact links, reduced motion, and viewport resizing. The
responsive matrix spans 320–1920px widths and short landscape screens.
Third-party requests are stubbed so tests do not depend on Google Maps, Google
Fonts, or the reservation service being available. Native Instagram/TikTok
webviews still need device checks; browser emulation cannot reproduce every
app's toolbar and navigation behavior.

## Layout conventions

- `src/style.css` defines a 4px spacing scale, fluid page gutters, the shared
  header height, and safe-area insets. `100dvh` adapts to mobile browser chrome,
  with a `100vh` fallback for older browsers.
- `.site-page` reserves the fixed header; `.page-panel` centers secondary-page
  content while leaving space for the floating reservation button.
- `src/styles/home.css` and `src/styles/pages.css` contain page-specific layouts.
  Use minimum heights and natural scrolling so short screens and larger text
  do not clip content.
- Alegreya Sans Medium is the body font; opening hours use Bold. Navigation
  retains Proxima Nova. Entrance animations respect reduced-motion preferences.

## Development skills

The requested `senior-frontend`, `senior-architect`, and `senior-backend` skills
are installed under `.claude/skills/` using:

```sh
npx claude-code-templates@latest --skill development/senior-frontend,development/senior-architect,development/senior-backend
```

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
