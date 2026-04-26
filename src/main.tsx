import ReactDOM from 'react-dom/client';
import { AuthWrapper } from './app/AuthWrapper';
import { authorizeSession } from './auth/authorizeSession';
import { runEarlyAuth } from './auth/earlyAuth';
import { AnalyticsInitializer } from './utils/analytics';
import { registerPWA } from './utils/pwa-utils';
import './styles/index.scss';

// Spec requirement: earlyAuth MUST run BEFORE React renders, BEFORE any
// auth-clearing logic, and BEFORE any API calls. This is intentionally
// the very first executable statement in the entry file.
const earlyAuthResult = runEarlyAuth();

// Spec step 4 — once tokens are captured, kick off a one-shot
// WebSocket authorize so `deriv_auth` is populated. Fire-and-forget so
// React rendering is never blocked by network latency.
if (earlyAuthResult.captured && earlyAuthResult.primary) {
    void authorizeSession(earlyAuthResult.primary.token);
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
