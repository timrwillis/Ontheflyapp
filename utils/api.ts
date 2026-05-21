import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";

const HARDCODED_URL = "https://u8y8kzvzgndjkymacqmf8v9manbx8fwa.app.specular.dev";

export const BACKEND_URL: string =
  (Constants.expoConfig?.extra?.backendUrl as string) || HARDCODED_URL;

export const BASE_URL = BACKEND_URL;

export const isBackendConfigured = (): boolean => {
  return !!BACKEND_URL && BACKEND_URL.length > 0;
};

export const getBearerToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    return null;
  }
};

export const apiCall = async <T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const url = `${BACKEND_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };

  const token = await getBearerToken();
  if (token) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data as T;
};

// Primary named export used throughout the app
export const api = apiCall;

export const apiGet = async <T = unknown>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "GET" });
};

export const apiPost = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const apiPut = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const apiPatch = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const apiDelete = async <T = unknown>(endpoint: string, data: unknown = {}): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getBearerToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const authenticatedApiCall = async <T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("Authentication token not found. Please sign in.");
  }
  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const authenticatedGet = async <T = unknown>(endpoint: string): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, { method: "GET" });
};

export const authenticatedPost = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const authenticatedPut = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const authenticatedPatch = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const authenticatedDelete = async <T = unknown>(endpoint: string, data: unknown = {}): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};
