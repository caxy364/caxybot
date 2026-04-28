import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import authStore from './auth/authStore';
import { authorizeSession } from './auth/authorizeSession';
import { migrateLegacyTokensFromUrl } from './auth/earlyAuth';
import { handleOAuthCallback } from './auth/oauthCallback';
import { AnalyticsInitializer } from './utils/analytics';
import { registerPWA } from './utils/pwa-utils';
import './styles/index.scss';

/**
 * Boot order is intentional and load-bearing:
 *
 *   1. Hydrate authStore from localStorage so the UI has a session
 *      immediately on hot reload / refresh.
 *   2. If the URL is an OAuth callback (`?code=&state=`), exchange the
 *      code for tokens BEFORE React mounts — otherwise the first paint
 *      flashes the logged-out screen.
 *   3. Migrate any legacy `?acct1=&token1=` URL into the authStore for
 *      users still hitting the older redirect format.
 *   4. Fire-and-forget WebSocket authorize probe so `deriv_auth` is
 *      populated for downstream consumers.
 */
const bootstrap = async () => {
    authStore.hydrateFromStorage();

    try {
        await handleOAuthCallback();
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Boot] OAuth callback failed', e);
    }

    migrateLegacyTokensFromUrl();

    const sessionToken = authStore.getActiveSessionToken();
    if (sessionToken) {
        void authorizeSession(sessionToken);
    }

    AnalyticsInitializer();

    // In development the PWA service worker caches stale build chunks
    // (lazy-compilation-proxy.[hash].js) that no longer exist after a
    // rebuild, breaking the app on every reload. Skip registration in
    // dev and proactively unregister any worker left over from a prior
    // session so the user sees fresh code immediately.
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        registerPWA()
            .then(registration => {
                if (registration) {
                    console.log('PWA service worker registered successfully for Chrome');
                } else {
                    console.log('PWA service worker disabled for non-Chrome browser');
                }
            })
            .catch(error => {
                console.error('PWA service worker registration failed:', error);
            });
    } else if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
            if (window.caches) {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(k => window.caches.delete(k)));
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[Dev] Failed to unregister service worker', e);
        }
    }

    ReactDOM.createRoot(document.getElementById('root')!).render(<AuthWrapper />);
};

void bootstrap();
