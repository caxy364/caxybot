import { derivRestPost } from './api-client';
import { OtpResponse } from './types';

export async function getAuthenticatedWsUrl(accessToken: string, accountId: string): Promise<string> {
    const path = `/trading/v1/options/accounts/${accountId}/otp`;
    const result = await derivRestPost<OtpResponse>(path, accessToken);

    if (!result?.data?.url) {
        throw new Error('OTP response did not contain a WebSocket URL');
    }

    return result.data.url;
}
