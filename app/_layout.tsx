import "react-native-reanimated";
import React, { useEffect, useRef, useState } from "react";
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme, Animated, View, Text, StyleSheet, Platform } from "react-native";
import {
  DarkTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminSwitcher } from "@/components/AdminSwitcher";
import { ADMIN_MODE } from "@/constants/AdminMode";
import { initializeAuth } from "@/lib/auth";

// Suppress Babel inject-source-location dev prop warning on web
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const _origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('__sourceLocation')
    ) {
      return;
    }
    _origConsoleError(...args);
  };
}

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function SplashOverlay({ onFadeComplete }: { onFadeComplete: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Pulsing glow on logo
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, { toValue: 1.0, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseOpacity, { toValue: 0.7, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    pulse.start();

    // Fade out after a short delay
    const timer = setTimeout(() => {
      pulse.stop();
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => onFadeComplete());
    }, 1200);

    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[splashStyles.container, { opacity }]}>
      <Animated.View style={{ opacity: pulseOpacity, alignItems: 'center' }}>
        <View style={splashStyles.logoRow}>
          <Text style={splashStyles.bolt}>⚡</Text>
          <Text style={splashStyles.logoText}>On The Fly</Text>
        </View>
      </Animated.View>
      <Text style={splashStyles.tagline}>Instant Coverage.</Text>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  bolt: {
    fontSize: 40,
  },
  logoText: {
    color: '#00FF87',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  tagline: {
    color: '#8A8A8A',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default function RootLayout() {
  const [loaded] = useFonts({
    "SpaceGrotesk-Regular": SpaceGrotesk_400Regular,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
    "SpaceGrotesk-SemiBold": SpaceGrotesk_600SemiBold,
  });

  // Warm the in-memory token cache from SecureStore as early as possible so
  // the first authenticated API call takes the fast path.
  useEffect(() => {
    initializeAuth();
  }, []);

  const [splashDone, setSplashDone] = useState(false);
  const [betaChecked, setBetaChecked] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  // App is always visible — splash overlay sits on top (zIndex 999) and fades out
  const appOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !splashDone) return;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('onthefly_beta_seen');
        if (!seen) {
          setShowBeta(true);
        }
      } catch (e) {
      } finally {
        setBetaChecked(true);
      }
    })();
  }, [loaded, splashDone]);

  useEffect(() => {
    if (splashDone && betaChecked && showBeta) {
      router.replace('/beta-welcome');
    }
  }, [splashDone, betaChecked, showBeta]);

  const handleSplashFadeComplete = () => {
    setSplashDone(true);
  };

  const OnTheFlyDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "#00FF87",
      background: "#0A0A0A",
      card: "#141414",
      text: "#F0F0F0",
      border: "rgba(255, 255, 255, 0.08)",
      notification: "#FF4444",
    },
  };

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={OnTheFlyDarkTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <RoleProvider>
              <WidgetProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <Animated.View style={{ flex: 1, opacity: appOpacity }}>
                    <Stack>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
                      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                      <Stack.Screen
                        name="shift/[id]"
                        options={{
                          headerShown: true,
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                          headerBackButtonDisplayMode: 'minimal',
                        }}
                      />
                      <Stack.Screen
                        name="worker/[id]"
                        options={{
                          headerShown: true,
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                          headerBackButtonDisplayMode: 'minimal',
                        }}
                      />
                      <Stack.Screen
                        name="create-shift"
                        options={{
                          presentation: 'formSheet',
                          headerShown: true,
                          title: 'Blast a Shift',
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="edit-profile"
                        options={{
                          presentation: 'formSheet',
                          headerShown: true,
                          title: 'Edit Profile',
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="nearby-workers"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="beta-welcome"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="notifications"
                        options={{
                          headerShown: true,
                          title: 'Notifications',
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="support"
                        options={{
                          headerShown: true,
                          title: 'Support',
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="settings"
                        options={{
                          headerShown: true,
                          title: 'Settings',
                          headerStyle: { backgroundColor: '#141414' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="onboarding/worker/index"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="onboarding/worker/profile"
                        options={{
                          headerShown: true,
                          title: 'Worker Setup',
                          headerStyle: { backgroundColor: '#0A0A0A' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="onboarding/worker/roles"
                        options={{
                          headerShown: true,
                          title: 'Your Roles',
                          headerStyle: { backgroundColor: '#0A0A0A' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="onboarding/worker/availability"
                        options={{
                          headerShown: true,
                          title: 'Availability',
                          headerStyle: { backgroundColor: '#0A0A0A' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="onboarding/worker/complete"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="onboarding/manager/profile"
                        options={{
                          headerShown: true,
                          title: 'Manager Setup',
                          headerStyle: { backgroundColor: '#0A0A0A' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="onboarding/manager/business"
                        options={{
                          headerShown: true,
                          title: 'Your Business',
                          headerStyle: { backgroundColor: '#0A0A0A' },
                          headerTintColor: '#F0F0F0',
                          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold', color: '#F0F0F0' },
                        }}
                      />
                      <Stack.Screen
                        name="onboarding/manager/complete"
                        options={{ headerShown: false, gestureEnabled: false }}
                      />
                    </Stack>
                  </Animated.View>
                  {Platform.OS !== 'web' && <SystemBars style="light" />}
                  {!splashDone && (
                    <SplashOverlay onFadeComplete={handleSplashFadeComplete} />
                  )}
                  {ADMIN_MODE && <AdminSwitcher />}
                </GestureHandlerRootView>
              </WidgetProvider>
            </RoleProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
