import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "SpaceGrotesk-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
    "SpaceGrotesk-Bold": require("../assets/fonts/SpaceMono-Bold.ttf"),
    "SpaceGrotesk-SemiBold": require("../assets/fonts/SpaceMono-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const ShiftSlingerDarkTheme: Theme = {
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
      <ThemeProvider value={ShiftSlingerDarkTheme}>
        <SafeAreaProvider>
          <RoleProvider>
            <WidgetProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
                </Stack>
                <SystemBars style="light" />
              </GestureHandlerRootView>
            </WidgetProvider>
          </RoleProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
