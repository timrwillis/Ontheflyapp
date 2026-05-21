import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/Colors';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const MANAGER_TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'home', ios_icon_name: 'house', label: 'Dashboard' },
  { name: 'shifts', route: '/(tabs)/shifts', icon: 'calendar-today', ios_icon_name: 'calendar', label: 'Shifts' },
  { name: 'workers', route: '/(tabs)/workers', icon: 'people', ios_icon_name: 'person.2', label: 'Workers' },
  { name: 'profile', route: '/(tabs)/profile', icon: 'person', ios_icon_name: 'person', label: 'Profile' },
];

const WORKER_TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'search', ios_icon_name: 'magnifyingglass', label: 'Find Shifts' },
  { name: 'shifts', route: '/(tabs)/shifts', icon: 'calendar-today', ios_icon_name: 'calendar', label: 'My Shifts' },
  { name: 'profile', route: '/(tabs)/profile', icon: 'person', ios_icon_name: 'person', label: 'Profile' },
];

const ADMIN_TABS: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'dashboard', ios_icon_name: 'square.grid.2x2', label: 'Dashboard' },
  { name: 'workers', route: '/(tabs)/workers', icon: 'people', ios_icon_name: 'person.2', label: 'Workers' },
  { name: 'businesses', route: '/(tabs)/businesses', icon: 'business', ios_icon_name: 'building.2', label: 'Businesses' },
  { name: 'profile', route: '/(tabs)/profile', icon: 'person', ios_icon_name: 'person', label: 'Profile' },
];

function getTabsForRole(role: string | null): TabBarItem[] {
  if (role === 'manager') return MANAGER_TABS;
  if (role === 'worker') return WORKER_TABS;
  if (role === 'admin') return ADMIN_TABS;
  return [];
}

function getContainerWidth(tabCount: number): number {
  if (tabCount <= 2) return screenWidth * 0.55;
  if (tabCount === 3) return screenWidth * 0.72;
  return screenWidth * 0.88;
}

export default function TabLayout() {
  const { currentRole, isLoading, refreshOnboardingStatus } = useRole();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const tabs = getTabsForRole(currentRole);
  const showTabBar = currentRole !== null;
  const containerWidth = getContainerWidth(tabs.length);

  // Auth guard — redirect to sign-in if no authenticated user
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth-screen');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Onboarding redirect logic (existing — do not remove)
  useEffect(() => {
    if (isLoading) return;
    if (!user) return; // Don't check onboarding if not authenticated
    const checkOnboarding = async () => {
      try {
        const status = await refreshOnboardingStatus();
        if (!status) return;
        if (!status.onboarding_completed) {
          const role = status.role ?? currentRole;
          if (!role) {
            router.replace('/onboarding/worker/index' as any);
          } else if (role === 'worker') {
            const step = status.onboarding_step;
            if (step === 'profile' || !step) {
              router.replace('/onboarding/worker/profile' as any);
            } else if (step === 'roles') {
              router.replace('/onboarding/worker/roles' as any);
            } else if (step === 'availability') {
              router.replace('/onboarding/worker/availability' as any);
            } else if (step === 'complete') {
              router.replace('/onboarding/worker/complete' as any);
            }
          } else if (role === 'manager') {
            const step = status.onboarding_step;
            if (step === 'profile' || !step) {
              router.replace('/onboarding/manager/profile' as any);
            } else if (step === 'business') {
              router.replace('/onboarding/manager/business' as any);
            } else if (step === 'complete') {
              router.replace('/onboarding/manager/complete' as any);
            }
          }
        }
      } catch (err) {
        console.warn('[TabLayout] Could not check onboarding status:', err);
      }
    };
    checkOnboarding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(home)" />
      </Stack>
      {showTabBar && (
        <FloatingTabBar
          tabs={tabs}
          containerWidth={containerWidth}
          borderRadius={35}
          bottomMargin={20}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
