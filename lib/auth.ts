import { nativeFetch } from '@/utils/polyfills/nativeFetch';

import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://ontheflyapp-production.up.railway.app";

export const BEARER_TOKEN_KEY = "onthefly_bearer_token";

const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

// Wraps every request to enforce JSON headers and normalize network errors
const authFetch: typeof fetch = async (input, init) => {
  const merged: RequestInit = {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  };
  try {
    return await nativeFetch(input as RequestInfo, merged);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isKotlinError = msg.includes('Kotlin') || msg.includes('convert');
    throw new Error(isKotlinError ? 'Connection error. Please try again.' : 'Network error. Please check your connection.');
  }
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "onthefly",
      storagePrefix: "onthefly",
      storage,
    }),
  ],
  fetchOptions: {
    customFetchImpl: authFetch,
    ...(Platform.OS === "web" ? {
      credentials: "include" as const,
      auth: {
        type: "Bearer" as const,
        token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
      },
    } : {}),
  },
});

// In-memory token cache — survives SecureStore timing issues and the
// useSession() null-flash race that previously wiped the SecureStore key.
// This is the primary source of truth during an app session; SecureStore
// is the persistence layer for cold starts.
let _inMemoryToken: string | null = null;

export async function setBearerToken(token: string) {
  _inMemoryToken = token; // Set in memory immediately — synchronous and reliable
  console.log('[Auth] Token cached in memory, length:', token.length);
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    try {
      await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
      console.log('[Auth] Token saved to SecureStore');
    } catch (e) {
      console.log('[Auth] SecureStore write failed (in-memory cache still active):', e);
    }
  }
}

export async function getBearerToken(): Promise<string | null> {
  // Fast path: return from in-memory cache — no async I/O needed
  if (_inMemoryToken) {
    console.log('[Auth] Token served from memory cache');
    return _inMemoryToken;
  }
  // Cold-start path: read from SecureStore and populate cache
  try {
    if (Platform.OS === "web") {
      const webToken = localStorage.getItem(BEARER_TOKEN_KEY);
      if (webToken) _inMemoryToken = webToken;
      console.log('[Auth] Token from localStorage:', webToken ? 'found' : 'null');
      return webToken;
    } else {
      console.log('[Auth] Reading token from SecureStore, key:', BEARER_TOKEN_KEY);
      const stored = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
      if (stored) _inMemoryToken = stored;
      console.log('[Auth] SecureStore read:', stored ? `found length:${stored.length}` : 'NULL');
      return stored;
    }
  } catch (e) {
    console.log('[Auth] SecureStore read failed:', e);
    return null;
  }
}

// Eagerly warm the in-memory cache on app start so the first getBearerToken()
// call takes the fast path. Call this from the root layout's first useEffect.
export async function initializeAuth(): Promise<string | null> {
  if (_inMemoryToken) {
    console.log('[Auth] Hydrating token from SecureStore: found (already in memory)');
    return _inMemoryToken;
  }
  try {
    if (Platform.OS === 'web') {
      const token = localStorage.getItem(BEARER_TOKEN_KEY);
      if (token) _inMemoryToken = token;
      console.log(`[Auth] Hydrating token from SecureStore: ${token ? 'found' : 'not found'}`);
      return token;
    } else {
      const token = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
      if (token) _inMemoryToken = token;
      console.log(`[Auth] Hydrating token from SecureStore: ${token ? 'found' : 'not found'}`);
      return token;
    }
  } catch {
    console.log('[Auth] Hydrating token from SecureStore: not found (read error)');
    return null;
  }
}

export async function clearAuthTokens() {
  console.log('[Auth] clearAuthTokens called');
  _inMemoryToken = null;
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    try {
      await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
    } catch {
      // Ignore delete errors
    }
  }
}

export { API_URL };
