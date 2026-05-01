import { DERIV_APP_ID, DERIV_API_BASE } from './types';

export function buildRestHeaders(accessToken: string): HeadersInit {
    return {
        Authorization: `Bearer ${accessToken}`,
        'Deriv-App-ID': DERIV_APP_ID,
        'Content-Type': 'application/json',
    };
}

export async function derivRestGet<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${DERIV_API_BASE}${path}`, {
        method: 'GET',
        headers: buildRestHeaders(accessToken),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`GET ${path} failed (${response.status}): ${body}`);
    }

    return response.json() as Promise<T>;
}

export async function derivRestPost<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
    const response = await fetch(`${DERIV_API_BASE}${path}`, {
        method: 'POST',
        headers: buildRestHeaders(accessToken),
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`POST ${path} failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
}
