import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import { runEarlyAuth } from './auth/earlyAuth';
import { AnalyticsInitializer } from './utils/analytics';
import { registerPWA } from './utils/pwa-utils';
import './styles/index.scss';

// MUST run BEFORE React mounts. If OAuth tokens are present on the URL the
// handler persists the session, strips the tokens, and triggers a hard
// redirect to /dashboard — in which case we skip rendering React entirely
// to avoid a brief flash of the unauthenticated UI before navigation.
const isRedirectingAfterOauth = runEarlyAuth();

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

if (!isRedirectingAfterOauth) {
    ReactDOM.createRoot(document.getElementById('root')!).render(<AuthWrapper />);
}
