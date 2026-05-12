import { authClient } from '@/utils/authClient';

const BASE_URL = 'https://xn8u74za85ysyp6vewujtpsarhqy53na.app.specular.dev';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await authClient.getSession();
    const token = (session?.data as any)?.session?.token ?? (session?.data as any)?.token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    console.warn('[API] Could not get auth token:', e);
  }
  return {};
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
  console.log(`[API] ${options?.method ?? 'GET'} ${BASE_URL}${path}`);
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[API] Error ${res.status} for ${path}:`, text);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  console.log(`[API] Response for ${path}:`, data);
  return data as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return api<T>(path, { method: 'GET' });
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return api<T>(path, { method: 'DELETE' });
}
