import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";
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
  // Use better-auth's reactive session hook instead of polling
  const { data: sessionData, isPending } = authClient.useSession();

  const user = (sessionData?.user as User | null) ?? null;
  const loading = isPending;

  // Sync bearer token and register push token whenever the reactive session updates.
  // IMPORTANT: clearAuthTokens() is intentionally NOT called here.
  //
  // On native, useSession() briefly shows {data: null, isPending: false} immediately
  // after a successful email sign-in before the session propagates. Any clearAuthTokens()
  // call during that null flash wipes the token that signInWithEmail just wrote — causing
  // every subsequent onboarding API call to fail.
  //
  // Token clearing is the sole responsibility of signOut(). Stale tokens in storage
  // cause 401 responses from the API, which the app handles by redirecting to sign-in.
  // The user's signed-out state is determined by the `user` object (null = not signed in),
  // not by whether a token exists in storage.
  useEffect(() => {
    if (sessionData?.session?.token) {
      setBearerToken(sessionData.session.token).then(() => {
        registerPushToken();
      });
    }
    // No else branch — never clear the token reactively.
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
      // Token clearing only happens in signOut() and in the useEffect reactive path.
      // Calling clearAuthTokens() on a null getSession() response races with a
      // just-completed sign-in and wipes the token before onboarding can use it.
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
      // better-auth can return the token at different paths depending on version
      // and configuration. Try every known location so we never miss it.
      const data = (result.data as any) ?? {};
      const token: string | undefined =
        data?.token ||
        data?.session?.token ||
        data?.user?.token ||
        data?.session?.id;
      console.log('[Auth] signIn token found:', token ? 'yes' : 'no', '| result.data keys:', Object.keys(data));
      if (token) {
        await setBearerToken(token);
        // Small pause to guarantee the SecureStore write is flushed before
        // the caller navigates and makes the first authenticated API call.
        await new Promise<void>((res) => setTimeout(res, 300));
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
      // Mirror the same pattern as signInWithEmail: try every known token location.
      const data = (result.data as any) ?? {};
      const token: string | undefined =
        data?.token ||
        data?.session?.token ||
        data?.user?.token ||
        data?.session?.id;
      console.log('[Auth] signUp token found:', token ? 'yes' : 'no', '| result.data keys:', Object.keys(data));
      if (token) {
        await setBearerToken(token);
        // Small pause to guarantee the SecureStore write is flushed before
        // the caller navigates and makes the first authenticated API call.
        await new Promise<void>((res) => setTimeout(res, 300));
      } else {
        console.log('[Auth] signUp full result.data:', JSON.stringify(data));
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
