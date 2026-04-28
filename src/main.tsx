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

    ReactDOM.createRoot(document.getElementById('root')!).render(<AuthWrapper />);
};

void bootstrap();
