# Deriv Bot

## Overview

Deriv Bot is a web-based automated trading platform that allows users to create trading bots without coding. The application uses a visual block-based programming interface (powered by Blockly) to let users design trading strategies. Users can build bots from scratch, use quick strategies, or import existing bot configurations. The platform supports both demo and real trading accounts through the Deriv trading API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Framework
- **React 18** with TypeScript as the primary UI framework
- **MobX** for state management across the application
- Stores are organized in `src/stores/` with a root store pattern that aggregates domain-specific stores (client, dashboard, chart, run-panel, etc.)

### Build System
- **Rsbuild** as the primary build tool (modern, fast bundler)
- Webpack configuration available as fallback
- Babel for transpilation with support for decorators and class properties

### Visual Programming
- **Blockly** library for the drag-and-drop bot building interface
- Custom blocks and toolbox configurations for trading-specific operations
- Workspace serialization for saving/loading bot strategies

### Trading Integration
- **@deriv/deriv-api** for WebSocket-based communication with Deriv trading servers
- Real-time market data streaming and order execution
- Support for multiple account types (demo, real, wallet-based)

### Authentication
- OAuth2-based authentication flow with OIDC support
- Token Management Backend (TMB) integration for enhanced session handling
- Multi-account support with account switching capabilities

### Charting
- **@deriv/deriv-charts** for displaying market data and trade visualizations
- Real-time chart updates during bot execution

### PWA Support
- Service worker for offline capabilities
- Installable as a Progressive Web App on mobile devices
- Offline fallback page

### Internationalization
- **@deriv-com/translations** for multi-language support
- CDN-based translation loading with Crowdin integration

### Analytics & Monitoring
- **RudderStack** for event tracking and analytics
- **Datadog** for session replay and performance monitoring
- **TrackJS** for error tracking in production

## External Dependencies

### Deriv Ecosystem Packages
- `@deriv-com/auth-client` - Authentication client
- `@deriv-com/analytics` - Analytics integration
- `@deriv-com/quill-ui` / `@deriv-com/quill-ui-next` - UI component library
- `@deriv-com/translations` - Internationalization
- `@deriv/deriv-api` - Trading API client
- `@deriv/deriv-charts` - Charting library

### Cloud Services
- **Cloudflare Pages** - Deployment platform
- **Google Drive API** - Bot strategy storage and sync
- **LiveChat** - Customer support integration
- **Intercom** - In-app messaging (feature-flagged)
- **GrowthBook** - Feature flag management
- **Survicate** - User surveys

### Third-Party Libraries
- `blockly` - Visual programming blocks
- `mobx` / `mobx-react-lite` - State management
- `react-router-dom` - Client-side routing
- `formik` - Form handling
- `@tanstack/react-query` - Server state management
- `js-cookie` - Cookie management
- `localforage` - Client-side storage
- `lz-string` / `pako` - Compression utilities

## Recent Changes

### Free Bots Feature (December 2025)
- Added Free Bots page with 12 pre-built trading bot templates
- Bot cards display with category filtering (Speed Trading, AI Trading, Pattern Analysis, etc.)
- Click-to-load functionality that imports bot XML into Bot Builder
- Responsive card design with hover effects and loading states
- Bot XML files stored in `/public/bots/` directory
- Files: `src/pages/free-bots/index.tsx`, `src/pages/free-bots/free-bots.scss`

### Truly portable build (April 2026 — second pass)
The first refactor missed three real portability traps that broke the app
on Vercel/GitHub Pages/Netlify. Fixed:

1. **`auth.config.ts` no longer throws at module-import time.** It used to
   call `requireEnv()` at the top of the module, which crashed the entire
   bundle (white screen) if any of `VITE_APP_ID` / `VITE_REDIRECT_URI` /
   `VITE_OAUTH_URL` were missing on the host. Now it provides safe public
   defaults (`VITE_APP_ID=111670`, the public Deriv OAuth endpoint) and
   resolves the redirect URI lazily.

2. **Redirect URI is now derived from `window.location.origin` at click
   time** — never from a build-time env var. Reason: Rsbuild's `define`
   plugin string-replaces `process.env.VITE_REDIRECT_URI` at build time,
   so a bundle built on Replit shipped the Replit URL into production.
   Now the same `dist/` works on Replit, Vercel (preview + prod), Netlify,
   GitHub Pages, and custom domains with zero env config — Deriv always
   sends the user back to whichever host they came from. The
   `VITE_REDIRECT_URI` injection has been removed from `rsbuild.config.ts`
   to guarantee the value can never leak into the bundle.

3. **`brand.ts` `isDomainAllowed` now allows every host.** The upstream
   Deriv check whitelisted only `deriv.com` / `binary.com` / `pages.dev`,
   which stripped platform icons on `vercel.app` etc. and made the UI
   look broken on third-party hosts.

**To deploy on Deriv's side**: register your deployment origin (e.g.
`https://yoursite.vercel.app/auth/callback`) on the Deriv app id once
(https://app.deriv.com/account/api-token → your app → Edit → Redirect URI).
That's the only manual step.

### Portable Vercel deployment (April 2026)
The project is fully portable — no Replit-specific code paths, no hardcoded
URLs, all environment-driven. Push to GitHub, connect to Vercel, set env
vars, deploy.

**`vercel.json`** at project root:
- `buildCommand: "npm run build"` and `outputDirectory: "dist"` match the Rsbuild pipeline.
- SPA rewrite: `{ "source": "/(.*)", "destination": "/" }` — every unmatched path
  resolves to `/` (index.html), which boots the `createBrowserRouter` so deep
  links like `/dashboard`, `/auth/callback`, `/free-bots` work after refresh.
  Vercel checks the filesystem first, so hashed static assets in `/static/*`
  are still served directly.
- `Cache-Control: public, max-age=31536000, immutable` for `/static/*` (the
  bundler hashes these filenames, so they're safe to cache forever).
- `Cache-Control: no-cache, no-store, must-revalidate` for `/sw.js` so PWA
  updates roll out immediately.
- COOP/COEP set to `unsafe-none` (matches the Rsbuild dev server, required by
  the Deriv chart workers).

**Environment variables** — set in **Vercel → Project Settings → Environment
Variables** (apply to Production / Preview / Development as needed):

| Variable | Production value |
|---|---|
| `VITE_APP_ID` | `111670` (or your own Deriv app id) |
| `VITE_REDIRECT_URI` | `https://derivfortunepro.vercel.app/auth/callback` |
| `VITE_OAUTH_URL` | `https://oauth.deriv.com/oauth2/authorize` |

The exact same three keys are required for local dev — see `.env.example`.

**Local development outside Replit**:
1. `git clone` the repo and `npm install`.
2. Create `.env.development` at the repo root with:
   ```
   VITE_APP_ID=111670
   VITE_REDIRECT_URI=http://localhost:3000/auth/callback
   VITE_OAUTH_URL=https://oauth.deriv.com/oauth2/authorize
   ```
3. (Optional) Create `.env.production` for local production builds.
4. `npm run start` — Rsbuild's `loadEnv()` automatically picks the right file
   based on `NODE_ENV`. The dev server defaults to port 3000.

`.env.development` and `.env.production` are intentionally **gitignored** —
secrets/config never live in the repo. The repo only ships `.env.example`
as a template.

**Node version**: `engines.node: 20.x` in `package.json` matches Vercel's
supported Node 20 runtime. Replit's container runs Node 20.20.0.

**Other notes**:
- `vercel.dr.json` is a Deriv-internal deploy descriptor that Vercel ignores
  (it only reads `vercel.json`).
- The OAuth login flow is fully click-driven (`window.location.href = url`,
  full-page redirect — no popups, no iframes). See `src/auth/loginWithDeriv.ts`.
- `auth.config.ts` reads only from `process.env.VITE_*` and throws at build
  time if any required var is missing — no `window.location.origin`, no
  `localhost` detection, no hardcoded URLs.

### Environment-driven Deriv OAuth (April 2026)
- Removed all hardcoded auth values from the codebase. The OAuth flow is now driven entirely by environment variables.
- Required env vars (set per environment, no code changes needed to switch):
  - `VITE_APP_ID` — Deriv app id
  - `VITE_REDIRECT_URI` — Full callback URL (e.g. `https://your-domain/auth/callback`)
  - `VITE_OAUTH_URL` — Deriv OAuth authorize endpoint (`https://oauth.deriv.com/oauth2/authorize`)
- `rsbuild.config.ts` exposes these vars to the client bundle (via Rsbuild's `loadEnv` for `.env` files plus a `process.env` define block for hosted environments like Replit / Vercel / Cloudflare).
- `src/auth/auth.config.ts` reads from `process.env.VITE_*` and throws if any value is missing — no `window.location.origin`, no `localhost` detection, no hardcoded URLs.
- `src/auth/loginWithDeriv.ts` builds the authorize URL purely from config and performs a full-page redirect.
- `src/pages/auth-callback/auth-callback.tsx` parses `acctN`/`tokenN`/`curN` triples, stores the active token in `sessionStorage` (mirrored to `localStorage` for legacy compatibility), and redirects to `/dashboard`.
- `.env.example` documents the contract; `.env` is gitignored. On Replit the values live in the Secrets / env panel.