import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens, getBearerToken } from "@/lib/auth";
import { apiPost } from "@/utils/api";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isInitializing: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      reject(new Error('OAuth popup not supported on native'));
      return;
    }

    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending } = authClient.useSession();

  // localUser is set imperatively on sign-in/sign-up and during cold-start hydration.
  // useSession() on the native expoClient path does NOT reliably update its reactive
  // state after sign-in before the route guard fires, so we maintain our own copy.
  const [localUser, setLocalUser] = useState<User | null>(null);

  // user = local state (fast/synchronous) ?? useSession fallback (for social auth etc.)
  const user = localUser ?? (sessionData?.user as User | null) ?? null;
  const loading = isPending;

  const [isInitializing, setIsInitializing] = useState(true);
  const initDone = useRef(false);

  // Safety net: always unblock the guard after 5 s — should rarely fire with the
  // new getSession() call below, but guarantees we don't block forever.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!initDone.current) {
        console.log('[Auth] Init safety-net timeout — unblocking guard');
        initDone.current = true;
        setIsInitializing(false);
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  // Cold-start auth hydration: runs when useSession() settles (isPending → false).
  useEffect(() => {
    if (isPending || initDone.current) return;

    if (sessionData?.user) {
      // useSession() has the session in its local cache — done immediately.
      const u = sessionData.user as User;
      console.log('[Auth] Init: session in cache, user:', u.id);
      setLocalUser(u);
      initDone.current = true;
      setIsInitializing(false);
      return;
    }

    // useSession() returned null. Check SecureStore, then validate with server.
    getBearerToken().then(async (token) => {
      if (!token) {
        console.log('[Auth] Init: no token found, user is unauthenticated');
        initDone.current = true;
        setIsInitializing(false);
        return;
      }

      // Token exists but useSession() doesn't have it — call getSession() to
      // validate the token and hydrate the user object in one network round-trip.
      console.log('[Auth] Init: token found in SecureStore, validating with server...');
      try {
        const session = await authClient.getSession();
        if (initDone.current) return; // Another path (e.g. sign-in) already finished init
        if (session?.data?.user) {
          if (session.data.session?.token) {
            await setBearerToken(session.data.session.token);
          }
          const u = session.data.user as User;
          setLocalUser(u);
          console.log('[Auth] Init: session validated, user:', u.id);
        } else {
          // Token exists but server says invalid — clear it.
          console.log('[Auth] Init: token present but session invalid, clearing');
          await clearAuthTokens();
        }
      } catch {
        // Network error — keep token, user can retry. Don't block the guard forever.
        console.log('[Auth] Init: session check failed (network?), keeping token');
      } finally {
        if (!initDone.current) {
          console.log('[Auth] Init: complete');
          initDone.current = true;
          setIsInitializing(false);
        }
      }
    });
  }, [isPending, sessionData]);

  // Keep localUser in sync with useSession() reactive updates (covers social OAuth
  // and any other path that updates useSession() without going through sign-in).
  useEffect(() => {
    if (sessionData?.user) {
      setLocalUser(sessionData.user as User);
    }
    if (sessionData?.session?.token) {
      setBearerToken(sessionData.session.token).then(() => {
        registerPushToken();
      });
    }
  }, [sessionData]);

  // Re-check session on deep link (OAuth callbacks)
  useEffect(() => {
    const subscription = Linking.addEventListener("url", () => {
      fetchUser();
    });
    return () => subscription.remove();
  }, []);

  const registerPushToken = async () => {
    if (Platform.OS === 'web') return;
    try {
      const Notifications = require('expo-notifications');
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      await apiPost('/api/notifications/push-token', { token });
    } catch {
      // Push token registration is best-effort; ignore errors silently
    }
  };

  const fetchUser = async () => {
    try {
      const session = await authClient.getSession();
      if (session?.data?.user) {
        if (session.data.session?.token) {
          await setBearerToken(session.data.session.token);
        }
        const u = session.data.user as User;
        setLocalUser(u);
        console.log('[Auth] fetchUser: user synced:', u.id);
      }
    } catch (error) {
      console.error("Failed to fetch user:", (error as Error)?.message || 'unknown error');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        throw new Error(result.error.message || 'Sign in failed. Please check your credentials.');
      }
      const data = (result.data as any) ?? {};
      const token: string | undefined =
        data?.token ||
        data?.session?.token ||
        data?.user?.token ||
        data?.session?.id;
      const responseUser = data?.user as User | undefined;
      console.log('[Auth] signIn token found:', token ? `yes (${token.slice(0, 12)}…)` : 'no', '| keys:', Object.keys(data));
      if (token) {
        await setBearerToken(token);
        console.log('[Auth] Token persisted to SecureStore');
      }
      if (responseUser?.id) {
        setLocalUser(responseUser);
        // Sign-in response has the user — mark init done so guard unblocks immediately.
        if (!initDone.current) {
          initDone.current = true;
          setIsInitializing(false);
        }
        console.log('[Auth] User state set:', responseUser.id);
      } else {
        // No user in response body — fall back to a getSession() round-trip.
        console.log('[Auth] signIn: no user in response, fetching from session...');
        await new Promise<void>((res) => setTimeout(res, 300));
        await fetchUser();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Kotlin') || msg.includes('convert')) {
        throw new Error('Connection error. Please try again.');
      }
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: name || email.split('@')[0],
      });
      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed. Please try again.');
      }
      const data = (result.data as any) ?? {};
      const token: string | undefined =
        data?.token ||
        data?.session?.token ||
        data?.user?.token ||
        data?.session?.id;
      const responseUser = data?.user as User | undefined;
      console.log('[Auth] Signup succeeded, token found:', token ? `yes (${token.slice(0, 12)}…)` : 'no', '| keys:', Object.keys(data));
      if (token) {
        await setBearerToken(token);
        console.log('[Auth] Token persisted to SecureStore');
      }
      if (responseUser?.id) {
        setLocalUser(responseUser);
        if (!initDone.current) {
          initDone.current = true;
          setIsInitializing(false);
        }
        console.log('[Auth] User state set:', responseUser.id);
      } else {
        console.log('[Auth] Signup: no user in response, fetching from session...');
        await new Promise<void>((res) => setTimeout(res, 300));
        await fetchUser();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Kotlin') || msg.includes('convert')) {
        throw new Error('Connection error. Please try again.');
      }
      throw err;
    }
  };

  const signInWithSocial = async (provider: "apple" | "google") => {
    if (Platform.OS === "web") {
      const token = await openOAuthPopup(provider);
      await setBearerToken(token);
      await fetchUser();
    } else {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: "/auth-callback",
      });
      if (error) {
        throw new Error(error.message || "Social sign in failed");
      }
      await fetchUser();
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");

  const signInWithApple = async () => {
    if (Platform.OS === "ios") {
      const AppleAuthentication = require("expo-apple-authentication");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }
      const { error } = await authClient.signIn.social({
        provider: "apple",
        idToken: { token: credential.identityToken },
      });
      if (error) {
        throw new Error(error.message || "Apple sign in failed");
      }
      await fetchUser();
    } else {
      await signInWithSocial("apple");
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // sign out errors are non-fatal
    } finally {
      setLocalUser(null);
      await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isInitializing,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
