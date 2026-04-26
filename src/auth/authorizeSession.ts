/**
 * Spec step 4 — verify the captured token by opening a single WebSocket
 * connection to Deriv, sending `{ authorize: <token> }`, and persisting
 * the response under `deriv_auth` as the canonical "logged in" signal.
 *
 * This is intentionally a one-shot probe — the rest of the application
 * still opens its own long-lived WebSocket via `api_base.init()` for
 * trading, charts and account-list updates. This call exists ONLY so the
 * spec key `deriv_auth` is populated (step 5: session persistence check).
 */

const SPEC_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=111670';
const SPEC_AUTH_KEY = 'deriv_auth';
const TIMEOUT_MS = 8000;

export const authorizeSession = (token: string): Promise<void> =>
    new Promise(resolve => {
        if (!token || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
            resolve();
            return;
        }

        let socket: WebSocket;
        try {
            socket = new WebSocket(SPEC_WS_URL);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[AUTH] Failed to open WebSocket', e);
            resolve();
            return;
        }

        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            try {
                socket.close();
            } catch {
                /* noop */
            }
            resolve();
        };

        socket.onopen = () => {
            // eslint-disable-next-line no-console
            console.log('[AUTH] Authorizing...');
            try {
                socket.send(JSON.stringify({ authorize: token }));
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[AUTH] Send authorize failed', e);
                finish();
            }
        };

        socket.onmessage = (event: MessageEvent<string>) => {
            try {
                const data = JSON.parse(event.data);
                if (data?.error) {
                    // eslint-disable-next-line no-console
                    console.error('[AUTH] Authorize error', data.error);
                } else if (data?.authorize) {
                    try {
                        localStorage.setItem(SPEC_AUTH_KEY, JSON.stringify(data.authorize));
                    } catch (storageErr) {
                        // eslint-disable-next-line no-console
                        console.error('[AUTH] Failed to persist deriv_auth', storageErr);
                    }
                    // eslint-disable-next-line no-console
                    console.log('[AUTH] Authorized', { loginid: data.authorize.loginid });
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[AUTH] Failed to parse authorize response', e);
            } finally {
                finish();
            }
        };

        socket.onerror = e => {
            // eslint-disable-next-line no-console
            console.error('[AUTH] WebSocket error', e);
            finish();
        };

        socket.onclose = () => finish();

        // Safety timeout — never let this Promise hang forever.
        window.setTimeout(finish, TIMEOUT_MS);
    });

export default authorizeSession;
