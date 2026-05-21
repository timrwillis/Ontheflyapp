// Capture native fetch BEFORE any polyfill can override it
const nativeFetch = global.fetch;

import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://u8y8kzvzgndjkymacqmf8v9manbx8fwa.app.specular.dev";

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

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

export { API_URL };
