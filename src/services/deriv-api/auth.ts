import { DERIV_APP_ID, DERIV_AUTH_URL, DERIV_TOKEN_URL, PkceParams, TokenResponse } from './types';

const PKCE_VERIFIER_KEY = 'deriv_pkce_verifier';
const PKCE_STATE_KEY = 'deriv_pkce_state';

function base64UrlEncode(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
}

export async function generatePkceParams(): Promise<PkceParams> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();
    return { codeVerifier, codeChallenge, state };
}

export function savePkceSession(params: PkceParams): void {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, params.codeVerifier);
    sessionStorage.setItem(PKCE_STATE_KEY, params.state);
}

export function getPkceVerifier(): string | null {
    return sessionStorage.getItem(PKCE_VERIFIER_KEY);
}

export function getPkceState(): string | null {
    return sessionStorage.getItem(PKCE_STATE_KEY);
}

export function clearPkceSession(): void {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(PKCE_STATE_KEY);
}

export function buildDerivAuthUrl(redirectUri: string, pkce: PkceParams): string {
    const url = new URL(DERIV_AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', DERIV_APP_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'read trade');
    url.searchParams.set('state', pkce.state);
    url.searchParams.set('code_challenge', pkce.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
}

export async function initiateDerivLogin(redirectUri: string): Promise<void> {
    const pkce = await generatePkceParams();
    savePkceSession(pkce);
    window.location.href = buildDerivAuthUrl(redirectUri, pkce);
}

export async function exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string
): Promise<TokenResponse> {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: DERIV_APP_ID,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
    });

    const response = await fetch(DERIV_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed (${response.status}): ${error}`);
    }

    return response.json() as Promise<TokenResponse>;
}

export interface CallbackResult {
    success: boolean;
    accessToken?: string;
    error?: string;
}

export async function handleDerivCallback(redirectUri: string): Promise<CallbackResult> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');

    if (!code) {
        return { success: false, error: 'No authorization code in callback URL' };
    }

    const savedState = getPkceState();
    if (returnedState !== savedState) {
        return { success: false, error: 'State mismatch — possible CSRF attack' };
    }

    const codeVerifier = getPkceVerifier();
    if (!codeVerifier) {
        return { success: false, error: 'No PKCE verifier found in session' };
    }

    try {
        const tokenData = await exchangeCodeForToken(code, codeVerifier, redirectUri);
        clearPkceSession();
        return { success: true, accessToken: tokenData.access_token };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}
