import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useRole } from '@/contexts/RoleContext';
import { COLORS } from '@/constants/Colors';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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

function BlastShiftFAB() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentRole } = useRole();
  if (currentRole !== 'manager') return null;
  return (
    <Pressable
      onPress={() => {
        console.log('[BlastShiftFAB] Blast Shift FAB pressed (iOS)');
        router.push('/create-shift');
      }}
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: insets.bottom + 88,
        height: 64,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#00FF85',
        borderRadius: 30,
        shadowColor: '#00FF85',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 999,
      }}
    >
      <MaterialIcons name="bolt" size={20} color="#000" />
      <View>
        <Text style={{ color: '#000', fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, letterSpacing: 1 }}>BLAST SHIFT</Text>
        <Text style={{ color: 'rgba(0,0,0,0.55)', fontFamily: 'SpaceGrotesk-Regular', fontSize: 10 }}>avg 4 min fill</Text>
      </View>
    </Pressable>
  );
}

function getContainerWidth(tabCount: number): number {
  if (tabCount <= 2) return screenWidth * 0.55;
  if (tabCount === 3) return screenWidth * 0.72;
  return screenWidth * 0.88;
}

export default function TabLayout() {
  const { currentRole } = useRole();
  const tabs = getTabsForRole(currentRole);
  const showTabBar = currentRole !== null;
  const containerWidth = getContainerWidth(tabs.length);

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
      <BlastShiftFAB />
    </View>
  );
}
