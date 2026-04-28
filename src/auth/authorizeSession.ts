/**
 * One-shot WebSocket authorize probe.
 *
 * Runs once at startup after the authStore has a token, opens a
 * single WebSocket against `wss://ws.derivws.com/...?app_id=<legacy>`,
 * sends `{ authorize: <token> }`, and persists the response under the
 * `deriv_auth` key. The bot's main api_base manages its own long-lived
 * connection — this is purely the "is the session usable?" probe.
 */
import { AUTH_CONFIG } from './auth.config';

const SPEC_AUTH_KEY = 'deriv_auth';
const TIMEOUT_MS = 8000;

const buildSpecWsUrl = (): string =>
    `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(AUTH_CONFIG.legacyAppId)}`;

export const authorizeSession = (token: string): Promise<void> =>
    new Promise(resolve => {
        if (!token || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
            resolve();
            return;
        }

        let socket: WebSocket;
        try {
            socket = new WebSocket(buildSpecWsUrl());
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

        window.setTimeout(finish, TIMEOUT_MS);
    });

export default authorizeSession;
