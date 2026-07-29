/**
 * Singleton API client. The access token lives in a module variable (read by the
 * client per request); the session layer sets it. Kept here — not in session.tsx —
 * so the client never imports React state (avoids a cycle).
 */

import { createApiClient } from '@firecare/api-client';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = createApiClient({ baseUrl, getToken: getAccessToken });
