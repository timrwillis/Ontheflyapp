// v4
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';

export const TAB_BAR_TOTAL_HEIGHT = 52 + 20 + 34; // tabHeight + bottomMargin + safe area buffer = 106

const { width: screenWidth } = Dimensions.get('window');

const NEON = '#00FF85';
const NEON_GLOW = 'rgba(0,255,133,0.12)';
const INACTIVE_COLOR = 'rgba(255,255,255,0.35)';
const CONTAINER_BG = 'rgba(10,10,12,0.96)';
const CONTAINER_BG_ANDROID = 'rgba(10,10,12,0.98)';
const MAX_TABS = 6;

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  ios_icon_name?: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth * 0.88,
  borderRadius = 28,
  bottomMargin = 16,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Fixed-size array of scale values to avoid hook ordering issues
  const scaleValues = useRef(
    Array.from({ length: MAX_TABS }, () => new Animated.Value(1))
  ).current;

  const activeTabIndex = React.useMemo(() => {
    let bestMatch = -1;
    let bestMatchScore = 0;

    tabs.forEach((tab, index) => {
      if (!tab) return;
      let score = 0;

      if (pathname === tab.route) {
        score = 100;
      } else if (pathname.startsWith(tab.route as string)) {
        score = 80;
      } else if (pathname.includes(tab.name)) {
        score = 60;
      } else if (
        String(tab.route).includes('/(tabs)/') &&
        pathname.includes(String(tab.route).split('/(tabs)/')[1])
      ) {
        score = 40;
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  if (!tabs || tabs.length === 0) return null;

  const handleTabPress = (route: Href, index: number) => {
    console.log('[FloatingTabBar] Tab pressed:', route, 'index:', index);

    const scaleVal = scaleValues[index];
    Animated.sequence([
      Animated.spring(scaleVal, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.spring(scaleVal, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
    ]).start();

    router.push(route);
  };

  const tabBarContent = (
    <View style={styles.tabsContainer}>
      {tabs.map((tab, index) => {
        if (!tab) return null;
        const isActive = activeTabIndex === index;
        const scaleVal = scaleValues[index];
        const iconColor = isActive ? NEON : INACTIVE_COLOR;
        const labelColor = isActive ? NEON : INACTIVE_COLOR;
        const fontFamily = isActive ? 'SpaceGrotesk-SemiBold' : 'SpaceGrotesk-Regular';
        const fontWeight = isActive ? ('700' as const) : ('400' as const);

        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => handleTabPress(tab.route, index)}
            activeOpacity={1}
          >
            <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleVal }] }]}>
              <View style={isActive ? styles.activeIconWrapper : styles.inactiveIconWrapper}>
                <IconSymbol
                  android_material_icon_name={tab.icon}
                  ios_icon_name={(tab.ios_icon_name ?? tab.icon) as any}
                  size={22}
                  color={iconColor}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: labelColor,
                    fontFamily,
                    fontWeight,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View
        style={[
          styles.container,
          {
            width: containerWidth,
            marginBottom: bottomMargin,
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="dark" style={[styles.blurContainer, { borderRadius }]}>
            <View style={[styles.iosOverlay, { borderRadius }]} />
            {tabBarContent}
          </BlurView>
        ) : (
          <View
            style={[
              styles.androidContainer,
              { borderRadius, backgroundColor: CONTAINER_BG_ANDROID },
            ]}
          >
            {tabBarContent}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  container: {
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  blurContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CONTAINER_BG,
  },
  androidContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeIconWrapper: {
    backgroundColor: NEON_GLOW,
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrapper: {
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 1,
  },
});
