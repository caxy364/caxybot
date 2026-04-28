/**
 * PKCE helpers (RFC 7636) for the OAuth 2.0 Authorization Code flow.
 *
 * - generateCodeVerifier(): cryptographically random 43-128 char string
 *   from the unreserved character set.
 * - generateCodeChallenge(verifier): SHA-256 of the verifier, base64-url
 *   encoded without padding (S256).
 * - generateState(): random opaque value for CSRF protection.
 */

const VERIFIER_BYTES = 64; // -> ~86 base64url chars, well within 43-128.

const base64UrlEncode = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    // btoa -> standard base64 -> rewrite to base64url, strip padding.
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomBytes = (length: number): Uint8Array => {
    const buf = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(buf);
        return buf;
    }
    // Last-resort fallback — should never run in a real browser.
    for (let i = 0; i < length; i += 1) buf[i] = Math.floor(Math.random() * 256);
    return buf;
};

export const generateCodeVerifier = (): string => base64UrlEncode(randomBytes(VERIFIER_BYTES));

export const generateState = (): string => base64UrlEncode(randomBytes(16));

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        throw new Error('Web Crypto SubtleCrypto is not available in this environment.');
    }
    const data = new TextEncoder().encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
};
