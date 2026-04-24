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