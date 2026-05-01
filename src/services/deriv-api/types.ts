export const DERIV_APP_ID = '32UpAZvxBqalqEFHVMTNS';
export const DERIV_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
export const DERIV_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
export const DERIV_API_BASE = 'https://api.derivws.com';
export const DERIV_PUBLIC_WS_URL = 'wss://ws.binaryws.com/websockets/v3';

export interface OtpResponse {
    data: {
        url: string;
    };
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}

export interface PkceParams {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
}

export interface DerivAccount {
    loginid: string;
    token: string;
    currency: string;
    is_virtual?: boolean;
}

export type WsMessageHandler = (data: Record<string, unknown>) => void;

export interface DerivApiConfig {
    accessToken: string;
    accountId: string;
}
