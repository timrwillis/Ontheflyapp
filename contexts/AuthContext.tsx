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

  const user = (sessionData?.user as User | null) ?? null;
  const loading = isPending;

  // isInitializing stays true until we've confirmed the user's auth state.
  // The route guard must NOT redirect while this is true.
  const [isInitializing, setIsInitializing] = useState(true);
  const initDone = useRef(false);

  // Safety net: unblock the guard after 5 s no matter what (handles network
  // errors and edge cases where session never arrives).
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

  // Determine when auth state has fully settled.
  useEffect(() => {
    if (isPending || initDone.current) return;

    if (sessionData?.user) {
      // Session confirmed by better-auth — done immediately.
      console.log('[Auth] Init complete: session confirmed, user:', sessionData.user.id);
      initDone.current = true;
      setIsInitializing(false);
      return;
    }

    // useSession returned null (no session or transient null flash).
    // Check our own SecureStore before declaring the user unauthenticated.
    getBearerToken().then(token => {
      if (!token) {
        // No token anywhere — definitely not authenticated.
        console.log('[Auth] Init complete: no token found, user is unauthenticated');
        initDone.current = true;
        setIsInitializing(false);
      }
      // Token exists but useSession is null = likely a null flash.
      // Stay initializing — the next sessionData update (when better-auth's
      // internal state propagates) will fire this effect again and hit the
      // sessionData?.user branch above. The 5 s safety net above guarantees
      // we don't block forever if the session never arrives.
    });
  }, [isPending, sessionData]);

  // Sync bearer token and register push token whenever the reactive session updates.
  // Never call clearAuthTokens() here — clearing is signOut()'s sole responsibility.
  useEffect(() => {
    if (sessionData?.session?.token) {
      setBearerToken(sessionData.session.token).then(() => {
        registerPushToken();
      });
    }
  }, [sessionData, isPending]);

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
      let session: Awaited<ReturnType<typeof authClient.getSession>> | null = null;
      try {
        session = await authClient.getSession();
      } catch {
        // getSession threw (network error or race) — leave existing token intact
      }
      if (session?.data?.session?.token) {
        await setBearerToken(session.data.session.token);
      }
      // Never call clearAuthTokens() here — fetchUser is a read-only token sync.
    } catch (error) {
      console.error("Failed to fetch user:", JSON.stringify(error) || (error as Error)?.message || 'unknown error');
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
      console.log('[Auth] signIn token found:', token ? `yes (${token.slice(0, 12)}…)` : 'no', '| keys:', Object.keys(data));
      if (token) {
        await setBearerToken(token);
        console.log('[Auth] Token persisted to SecureStore');
        // Wait for the SecureStore write to flush, then sync better-auth's
        // internal session so useSession() returns a non-null user.
        await new Promise<void>((res) => setTimeout(res, 300));
        await fetchUser();
      } else {
        console.log('[Auth] signIn full result.data:', JSON.stringify(data));
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
      console.log('[Auth] Signup succeeded, token found:', token ? `yes (${token.slice(0, 12)}…)` : 'no', '| keys:', Object.keys(data));
      if (token) {
        await setBearerToken(token);
        console.log('[Auth] Token persisted to SecureStore');
        // Wait for the SecureStore write to flush, then sync better-auth's
        // internal session so useSession() returns a non-null user before
        // the user navigates to the main tabs after onboarding.
        await new Promise<void>((res) => setTimeout(res, 300));
        await fetchUser();
      } else {
        console.log('[Auth] Signup full result.data:', JSON.stringify(data));
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
