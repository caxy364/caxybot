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
- **Legacy flow (active):** OAuth2-based authentication via `@deriv-com/auth-client` (OIDC) with TMB session handling
- **New API flow (added, layered on top):** OAuth2 Authorization Code + PKCE via `https://auth.deriv.com/oauth2/auth`
  - App ID: `32UpAZvxBqalqEFHVMTNS`
  - PKCE helpers live in `src/services/deriv-api/auth.ts`
  - Callback page (`src/pages/callback/callback-page.tsx`) auto-detects which flow triggered it (PKCE vs OIDC)
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

### New Deriv API Layer + Platform Cleanup (May 2026)
- **Removed** Deriv Trader and Smart Trader from the platform switcher — Deriv Bot is now the only platform shown
- **Added** `src/services/deriv-api/` — a self-contained new API service layer:
  - `auth.ts` — OAuth2 PKCE flow (PKCE generation, auth URL builder, code→token exchange, callback handler)
  - `api-client.ts` — REST API helper with mandatory `Authorization: Bearer` + `Deriv-App-ID` headers
  - `otp.ts` — Calls `/trading/v1/options/accounts/{id}/otp` to get an authenticated WebSocket URL
  - `websocket-manager.ts` — `DerivWebSocketManager` class (connect, balance, ticks, proposals, buy, monitor, reconnect) + `DerivPublicWebSocket` for unauthenticated market data
  - `types.ts` — Shared constants (App ID, endpoint URLs) and TypeScript interfaces
  - `index.ts` — Barrel export
- **Added** `src/hooks/api/useDerivNewApi.ts` — React hooks:
  - `usePublicWebSocket()` — Connects to public WS for market data (no auth needed)
  - `useAuthenticatedWebSocket({ accessToken, accountId })` — Calls OTP endpoint then opens authenticated WS
- **Updated** `src/pages/callback/callback-page.tsx` — detects PKCE vs OIDC callbacks; PKCE path exchanges the `code` for an access token and stores it in `localStorage.deriv_access_token`
- Redirect URI is left configurable (`${window.location.origin}/callback`) — must be registered in the Deriv Developers Dashboard before using the new OAuth2 PKCE flow

### Free Bots Feature (December 2025)
- Added Free Bots page with 12 pre-built trading bot templates
- Bot cards display with category filtering (Speed Trading, AI Trading, Pattern Analysis, etc.)
- Click-to-load functionality that imports bot XML into Bot Builder
- Responsive card design with hover effects and loading states
- Bot XML files stored in `/public/bots/` directory
- Files: `src/pages/free-bots/index.tsx`, `src/pages/free-bots/free-bots.scss`