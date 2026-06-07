import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, authenticatedGet, authenticatedPost, authenticatedPatch } from '@/utils/api';
import { ShiftCard, Shift } from '@/components/ShiftCard';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ShiftCardSkeleton, SkeletonLine } from '@/components/SkeletonLoader';
import { RushFeedSection } from '@/components/RushFeedSection';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DEMO_SHIFTS, DEMO_WORKERS } from '@/constants/DemoData';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, TouchableWithoutFeedback } from 'react-native';

// â”€â”€â”€ Shared glass style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
}) as object;

const emergencyGlow = Platform.select({
  web: { boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)' },
  default: { shadowColor: '#FF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
}) as object;

// â”€â”€â”€ Landing Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FALLBACK_ACTIVITY_FEED = [
  'âš¡ Bartender accepted at Prime Social KC',
  'âœ… Server filled shift at Midtown Tavern',
  'ðŸŽ¯ VIP event staffed in 4 minutes',
  'âš¡ Line Cook confirmed at Neon Alley',
  'âœ… Barback filled at The Copper Mug',
  'âš¡ Host confirmed at Rooftop Lounge',
];

const FALLBACK_LIVE_FEED_ITEMS = [
  { iconName: 'check-circle' as const, iconColor: COLORS.primary, text: 'Bartender confirmed at Prime Social KC', time: 'just now' },
  { iconName: 'bolt' as const, iconColor: '#FFB800', text: 'Server accepted shift at Midtown Tavern', time: '2m' },
  { iconName: 'star' as const, iconColor: '#60A5FA', text: 'VIP event fully staffed in 4 minutes', time: '8m' },
  { iconName: 'check-circle' as const, iconColor: COLORS.primary, text: 'Line Cook filled at Neon Alley', time: '14m' },
  { iconName: 'bolt' as const, iconColor: '#FFB800', text: 'Rush coverage filled at Velvet Room', time: '22m' },
];

const FEED_ICONS = [
  { iconName: 'check-circle' as const, iconColor: COLORS.primary },
  { iconName: 'bolt' as const, iconColor: '#FFB800' },
  { iconName: 'star' as const, iconColor: '#60A5FA' },
];

interface MarketplaceStats {
  workers_available?: number;
  restaurants_hiring?: number;
  shifts_filled_this_week?: number;
  recent_activity?: { text: string; time: string }[];
}

interface FullMarketplaceStats {
  workers_available?: number;
  restaurants_hiring?: number;
  shifts_filled_week?: number;
  // Backend returns objects { text, time } â€” same shape as MarketplaceStats
  recent_activity?: { text: string; time: string }[];
}

// Shared marketplace stats â€” fetched once, used by all dashboards
let _cachedStats: FullMarketplaceStats = {
  workers_available: 31,
  restaurants_hiring: 14,
  shifts_filled_week: 127,
  recent_activity: [
    { text: 'Bartender accepted at Prime Social KC', time: '2m' },
    { text: 'Server filled shift at Midtown Tavern', time: '8m' },
    { text: 'VIP event staffed in 4 minutes', time: '14m' },
    { text: 'Line Cook confirmed at Neon Alley', time: '22m' },
    { text: 'Barback filled at The Copper Mug', time: '35m' },
  ],
};

function LandingScreen() {
  const { setRole } = useRole();
  const router = useRouter();
  const tickerScrollRef = useRef<ScrollView>(null);
  const tickerOffset = useRef(0);
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const [stats, setStats] = useState<MarketplaceStats>({});
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiGet<MarketplaceStats>('/api/marketplace/stats');
        if (data) setStats(data);
      } catch {
        // keep defaults
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Pulsing dot animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [dotOpacity]);

  // Auto-scroll ticker
  useEffect(() => {
    const interval = setInterval(() => {
      tickerOffset.current += 1;
      tickerScrollRef.current?.scrollTo({ x: tickerOffset.current, animated: false });
      if (tickerOffset.current > 2000) {
        tickerOffset.current = 0;
        tickerScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = async (role: 'manager' | 'worker' | 'admin') => {
    if (role === 'admin') {
      await setRole(role);
      return;
    }
    // Always go through the role selector (onboarding/worker/index) so that
    // POST /api/onboarding/role is called before any profile screen. Navigating
    // directly to a profile screen skips that API call and leaves the user
    // with no role persisted in the backend.
    router.push('/onboarding/worker/index' as any);
  };

  const workersAvailable = stats.workers_available ?? 31;
  const restaurantsHiring = stats.restaurants_hiring ?? 14;
  const shiftsFilled = stats.shifts_filled_this_week ?? 127;

  const activityFeed = stats.recent_activity?.length
    ? stats.recent_activity.map((item, i) => (i % 2 === 0 ? 'âœ… ' : 'âš¡ ') + item.text)
    : FALLBACK_ACTIVITY_FEED;

  const liveFeedItems = stats.recent_activity?.length
    ? stats.recent_activity.slice(0, 5).map((item, i) => ({
        ...FEED_ICONS[i % FEED_ICONS.length],
        text: item.text,
        time: item.time,
      }))
    : FALLBACK_LIVE_FEED_ITEMS;

  const statRows = [
    { value: String(workersAvailable), label: 'workers online' },
    { value: String(restaurantsHiring), label: 'venues hiring' },
    { value: String(shiftsFilled), label: 'filled today' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={{ paddingTop: 64, paddingHorizontal: 24, alignItems: 'center', paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 28 }}>âš¡</Text>
          <Text style={{ color: COLORS.primary, fontSize: 34, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1.5 }}>
            On The Fly
          </Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', letterSpacing: -0.5, marginBottom: 28, lineHeight: 34 }}>
          Fill the floor fast.
        </Text>

        {/* Live stats row */}
        {statsLoading ? (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, width: '100%' }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
                <SkeletonLine width={48} height={30} borderRadius={6} style={{ marginBottom: 6 }} />
                <SkeletonLine width={56} height={10} borderRadius={4} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, width: '100%' }}>
            {statRows.map((stat) => (
              <View key={stat.label} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, opacity: dotOpacity }} />
                  <Text style={{ color: COLORS.primary, fontSize: 30, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1 }}>
                    {stat.value}
                  </Text>
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Activity ticker */}
        <View style={{ width: '100%', overflow: 'hidden', marginBottom: 28 }}>
          <ScrollView
            ref={tickerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
          >
            {[...activityFeed, ...activityFeed].map((item, i) => {
              const firstSpace = item.indexOf(' ');
              const firstWord = firstSpace > -1 ? item.slice(0, firstSpace) : item;
              const rest = firstSpace > -1 ? item.slice(firstSpace) : '';
              return (
                <View key={i} style={{
                  backgroundColor: 'rgba(0,255,133,0.08)',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: 'rgba(0,255,133,0.2)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, opacity: dotOpacity }} /><Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>{firstWord}</Text>{rest ? <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>{rest}</Text> : null}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* CTA Buttons */}
        <View style={{ gap: 12, width: '100%', marginBottom: 32 }}>
          <AnimatedPressable onPress={() => handleRoleSelect('manager')}>
            <View style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 20,
              alignItems: 'center',
              ...primaryGlow,
            }}>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                I'm a Manager â€” Blast a Shift
              </Text>
            </View>
          </AnimatedPressable>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: -6 }}>
            avg 4 min fill time
          </Text>
          <AnimatedPressable onPress={() => handleRoleSelect('worker')}>
            <View style={{ ...glass, paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                I'm a Worker â€” Find Work Tonight
              </Text>
            </View>
          </AnimatedPressable>
          <Text style={{ color: COLORS.primary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: -6 }}>
            Shifts available now â†’
          </Text>
          <AnimatedPressable onPress={() => handleRoleSelect('admin')}>
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                Admin Access
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Live Activity Feed */}
      <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
        <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 1.5, marginBottom: 14 }}>
          LIVE ACTIVITY
        </Text>
        <View style={{ ...glass, padding: 0, overflow: 'hidden' }}>
          {liveFeedItems.map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: i < liveFeedItems.length - 1 ? 1 : 0,
              borderBottomColor: 'rgba(255,255,255,0.05)',
            }}>
              <MaterialIcons name={item.iconName} size={18} color={item.iconColor} />
              <Text style={{ color: COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', flex: 1 }}>
                {item.text}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular' }}>
                {item.time}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// â”€â”€â”€ Worker Mini Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface WorkerMini {
  id: string;
  name: string;
  roles?: string[];
  isAvailable?: boolean;
}

const SCARCITY_INSIGHTS = [
  { icon: 'ðŸŸ¢', text: '12 workers online now' },
  { icon: 'ðŸ”´', text: 'Only 4 bartenders available' },
  { icon: 'âš¡', text: 'High demand tonight' },
  { icon: 'ðŸƒ', text: '3 responded in 5 min' },
  { icon: 'ðŸ“ˆ', text: 'Weekend rush active' },
  { icon: 'ðŸŽ¯', text: '94% fill rate this week' },
];

const FALLBACK_ACTIVITY_ITEMS = [
  { icon: 'âœ…', text: 'Bartender confirmed at Prime Social KC', time: '2m ago', color: COLORS.primary },
  { icon: 'âš¡', text: 'Server accepted shift at Midtown Tavern', time: '8m ago', color: COLORS.accent },
  { icon: 'ðŸŽ¯', text: 'VIP event fully staffed in 4 minutes', time: '23m ago', color: '#60A5FA' },
  { icon: 'âœ…', text: 'Line Cook filled at Neon Alley', time: '41m ago', color: COLORS.primary },
  { icon: 'âš¡', text: 'Rush coverage filled at Velvet Room', time: '1h ago', color: COLORS.accent },
];

function WorkerMiniCard({ worker }: { worker: WorkerMini }) {
  const initials = worker.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const firstName = worker.name.split(' ')[0];
  const primaryRole = worker.roles?.[0] ?? 'Staff';

  const nameCode0 = worker.name.charCodeAt(0) || 65;
  const nameCode1 = worker.name.charCodeAt(1) || 65;
  const nameCode2 = worker.name.charCodeAt(2) || 65;

  const ratingRaw = (nameCode0 % 10) / 10 + 4.0;
  const rating = Math.min(5.0, Math.max(4.0, ratingRaw));
  const ratingDisplay = rating.toFixed(1);

  const reliability = 80 + (nameCode1 % 20);
  const reliabilityColor = reliability >= 95 ? COLORS.primary : COLORS.textSecondary;
  const reliabilityDisplay = reliability + '% reliable';

  const distanceMins = (nameCode2 % 12) + 1;
  const distanceDisplay = distanceMins + ' min away';

  const avatarBorderColor = worker.isAvailable ? COLORS.primary : 'rgba(255,255,255,0.15)';

  return (
    <View style={{
      width: 110,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      gap: 3,
    }}>
      <View style={{ position: 'relative', marginBottom: 4 }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: COLORS.primaryMuted,
          borderWidth: 2,
          borderColor: avatarBorderColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            {initials}
          </Text>
        </View>
        {worker.isAvailable && (
          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: COLORS.primary,
            borderWidth: 1.5,
            borderColor: COLORS.background,
          }} />
        )}
      </View>
      <Text style={{ color: COLORS.text, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center' }} numberOfLines={1}>
        {firstName}
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }} numberOfLines={1}>
        {primaryRole}
      </Text>
      <Text style={{ color: COLORS.text, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
        {'â­ ' + ratingDisplay}
      </Text>
      <Text style={{ color: reliabilityColor, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
        {reliabilityDisplay}
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
        {distanceDisplay}
      </Text>
    </View>
  );
}

// â”€â”€â”€ Section Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionHeader({
  title,
  count,
  sectionColor,
  sectionBg,
}: {
  title: string;
  count: number;
  sectionColor: string;
  sectionBg: string;
}) {
  const countText = count + ' shifts';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 }}>
      <View style={{ width: 3, height: 16, backgroundColor: sectionColor, borderRadius: 2 }} />
      <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 0.3 }}>
        {title}
      </Text>
      <View style={{ flex: 1 }} />
      <View style={{ backgroundColor: sectionBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ color: sectionColor, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
          {countText}
        </Text>
      </View>
    </View>
  );
}

// â”€â”€â”€ Manager Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ManagerDashboard() {
  const { currentUser, demoDataActive } = useRole();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState({ open: 0, filled: 0, confirmed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyWorkers, setNearbyWorkers] = useState<WorkerMini[]>([]);
  const [activityItems, setActivityItems] = useState(FALLBACK_ACTIVITY_ITEMS);

  // Emergency banner pulse animation
  const emergencyPulse = useRef(new Animated.Value(0.4)).current;

  // LIVE dot pulse animation
  const liveGreenPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyPulse, { toValue: 1.0, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(emergencyPulse, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [emergencyPulse]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveGreenPulse, { toValue: 1.0, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(liveGreenPulse, { toValue: 0.4, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [liveGreenPulse]);

  const firstName = currentUser?.name?.split(' ')[0] ?? 'Manager';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const loadData = useCallback(async () => {
    if (!user) return;
    if (demoDataActive) {
      const open = DEMO_SHIFTS.filter((s) => s.status === 'open').length;
      const filled = DEMO_SHIFTS.filter((s) => s.status === 'filled').length;
      const confirmed = DEMO_SHIFTS.filter((s) => s.status === 'pending').length;
      setShifts(DEMO_SHIFTS);
      setStats({ open, filled, confirmed });
      setNearbyWorkers(DEMO_WORKERS.slice(0, 8).map((w) => ({ id: w.id, name: w.name, roles: w.roles, isAvailable: w.isAvailable ?? false })));
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [shiftsData, workersData, marketplaceData] = await Promise.all([
        authenticatedGet<{ shifts: Shift[] }>('/api/shifts?role=manager'),
        authenticatedGet<WorkerMini[]>('/api/worker-profiles?available=true').catch(() => []),
        apiGet<MarketplaceStats>('/api/marketplace/stats').catch(() => null),
      ]);
      const shiftList = Array.isArray((shiftsData as any)?.shifts) ? (shiftsData as any).shifts : Array.isArray(shiftsData) ? shiftsData : [];
      setShifts(shiftList);
      const open = shiftList.filter((s: Shift) => s.status === 'open').length;
      const filled = shiftList.filter((s: Shift) => s.status === 'filled').length;
      const confirmed = shiftList.filter((s: Shift) => s.status === 'pending').length;
      setStats({ open, filled, confirmed });
      setNearbyWorkers(Array.isArray(workersData) ? workersData : []);
      if (marketplaceData?.recent_activity?.length) {
        const ITEM_ICONS = ['âœ…', 'âš¡', 'ðŸŽ¯', 'âœ…', 'âš¡'];
        const ITEM_COLORS = [COLORS.primary, COLORS.accent, '#60A5FA', COLORS.primary, COLORS.accent];
        setActivityItems(
          marketplaceData.recent_activity.slice(0, 5).map((item, i) => ({
            icon: ITEM_ICONS[i % ITEM_ICONS.length],
            text: item.text,
            time: item.time,
            color: ITEM_COLORS[i % ITEM_COLORS.length],
          }))
        );
      }
    } catch (err) {
      console.error('[ManagerDashboard] Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoDataActive, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const activeShifts = shifts.filter((s) => s.status === 'open' || s.status === 'pending');
  const emergencyShifts = activeShifts.filter((s) => s.urgency === 'emergency' || s.urgency === 'tonight');
  const hasEmergency = emergencyShifts.length > 0;

  const displayedWorkers = nearbyWorkers.slice(0, 5);
  const extraWorkers = nearbyWorkers.length > 5 ? nearbyWorkers.length - 5 : 0;

  const statCards = [
    { label: 'Open Shifts', value: stats.open, color: COLORS.primary, borderColor: COLORS.primary },
    { label: 'Filled Today', value: stats.filled, color: COLORS.accent, borderColor: COLORS.accent },
    { label: 'Confirmed', value: stats.confirmed, color: '#60A5FA', borderColor: '#60A5FA' },
  ];

  const [marketStats, setMarketStats] = useState<FullMarketplaceStats>(_cachedStats);

  useEffect(() => {
    const fetchMarketStats = async () => {
      try {
        const data = await apiGet<FullMarketplaceStats>('/api/marketplace/stats');
        if (data) {
          _cachedStats = { ..._cachedStats, ...data };
          setMarketStats(_cachedStats);
        }
      } catch { /* keep defaults */ }
    };
    fetchMarketStats();
    const interval = setInterval(fetchMarketStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const scarcityPills = (marketStats.recent_activity && marketStats.recent_activity.length > 0)
    ? marketStats.recent_activity.slice(0, 6).map((item) => {
        // recent_activity items are objects { text, time } from the backend
        const rawText = item.text ?? '';
        const icon = rawText.startsWith('âœ…') ? 'âœ…'
          : rawText.startsWith('âš¡') ? 'âš¡'
          : rawText.startsWith('ðŸŽ¯') ? 'ðŸŽ¯'
          : rawText.startsWith('ðŸ”¥') ? 'ðŸ”¥'
          : 'ðŸ“';
        const cleanText = rawText.replace(/^[âœ…âš¡ðŸŽ¯ðŸ”¥ðŸ“]\s*/u, '');
        return { icon, text: cleanText };
      })
    : SCARCITY_INSIGHTS;

  const bartenderCount = nearbyWorkers.filter((w) => w.roles?.[0] === 'Bartender').length;
  const scarcityBartenderCount = bartenderCount > 0 ? bartenderCount : 4;
  const scarcityText = 'Only ' + scarcityBartenderCount + ' bartenders left';
  const workerCountDisplay = String(nearbyWorkers.length);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <View>
            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 1.5, marginBottom: 4 }}>
              âš¡ ON THE FLY
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
              {`${greeting},`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
                {firstName}
              </Text>
              <Text style={{ fontSize: 22 }}>ðŸ‘‹</Text>
            </View>
          </View>
          <AnimatedPressable onPress={() => router.push('/notifications')}>
            <View style={{ width: 44, height: 44, ...glass, borderRadius: 22, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="notifications" size={20} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Emergency Banner */}
        {hasEmergency && (
          <Animated.View style={{
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: COLORS.danger,
            backgroundColor: 'rgba(255, 68, 68, 0.08)',
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: emergencyPulse,
            ...emergencyGlow,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,68,68,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>ðŸš¨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.danger, fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  Emergency Coverage Needed
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                  {'You have ' + emergencyShifts.length + ' open emergency shift' + (emergencyShifts.length > 1 ? 's' : '')}
                </Text>
              </View>
            </View>
            <AnimatedPressable onPress={() => router.push('/create-shift')}>
              <View style={{ backgroundColor: COLORS.danger, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  Fill Now â†’
                </Text>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {statCards.map((stat) => (
            <View key={stat.label} style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 14,
              alignItems: 'center',
              borderBottomWidth: 3,
              borderBottomColor: stat.borderColor,
            }}>
              <Text style={{ color: stat.color, fontSize: 32, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1 }}>
                {stat.value}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: 4 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Scarcity Insight Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginBottom: 28 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {scarcityPills.map((insight, i) => (
            <View key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
              <Text style={{ fontSize: 12 }}>{insight.icon}</Text>
              <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                {insight.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginBottom: 28 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          <AnimatedPressable onPress={() => router.push('/create-shift')}>
            <View style={{
              backgroundColor: 'rgba(255,68,68,0.15)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: COLORS.danger,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
              <Text style={{ fontSize: 14 }}>ðŸš¨</Text>
              <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Emergency Shift
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => {}}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>â†©</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Repost Last
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => router.push('/(tabs)/workers')}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>ðŸ‘¥</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                View Workers
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => {}}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>âœ‰</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Invite Staff
              </Text>
            </View>
          </AnimatedPressable>
        </ScrollView>

        {/* Available Now â€” upgraded header */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            {/* LIVE indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 10 }}>
              <Animated.View style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: COLORS.primary,
                opacity: liveGreenPulse,
              }} />
              <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 1.5 }}>
                LIVE
              </Text>
            </View>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', flex: 1 }}>
              Available Now
            </Text>
            {nearbyWorkers.length > 0 && (
              <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 }}>
                <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  {workerCountDisplay}
                </Text>
              </View>
            )}
            <Text style={{ color: COLORS.danger, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', marginRight: 10 }}>
              {scarcityText}
            </Text>
            <AnimatedPressable onPress={() => router.push('/nearby-workers')}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Browse All â†’
              </Text>
            </AnimatedPressable>
          </View>
          {nearbyWorkers.length === 0 ? (
            <View style={{ ...glass, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                No workers available right now
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {displayedWorkers.map((worker) => (
                <WorkerMiniCard key={worker.id} worker={worker} />
              ))}
              {extraWorkers > 0 && (
                <AnimatedPressable onPress={() => router.push('/nearby-workers')}>
                  <View style={{
                    width: 110,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                      {'+' + extraWorkers}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                      more
                    </Text>
                  </View>
                </AnimatedPressable>
              )}
            </ScrollView>
          )}
        </View>

        {/* Browse Marketplace Banner */}
        <AnimatedPressable onPress={() => router.push('/nearby-workers')} style={{ marginBottom: 28 }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            borderLeftWidth: 4,
            borderLeftColor: COLORS.primary,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialIcons name="people" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 2 }}>
                Browse All Nearby Workers
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                {nearbyWorkers.length > 0 ? nearbyWorkers.length + ' verified workers available tonight' : 'Find verified workers available tonight'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={COLORS.primary} />
          </View>
        </AnimatedPressable>

        {/* Active Shifts */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            Active Shifts
          </Text>
          {activeShifts.length > 0 && (
            <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                {activeShifts.length}
              </Text>
            </View>
          )}
        </View>
        {loading ? (
          <>
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
          </>
        ) : activeShifts.length === 0 ? (
          <View style={{ ...glass, padding: 32, alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name="check-circle" size={28} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>
              All shifts filled!
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk-Regular' }}>
              Need coverage tonight? Blast a new shift.
            </Text>
          </View>
        ) : (
          activeShifts.map((shift, i) => {
            const workersNeeded = shift.workers_needed ?? 1;
            const seedChar = shift.id ? shift.id.charCodeAt(0) : 65;
            const workersConfirmed = seedChar % (workersNeeded + 1);
            const fillPercent = workersNeeded > 0 ? workersConfirmed / workersNeeded : 0;
            const shiftRole = (shift as any).role ?? 'Staff';
            const fillLabel = shiftRole + ' Â· Tonight Â· ' + workersConfirmed + '/' + workersNeeded + ' filled';
            return (
              <View key={shift.id}>
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: -8,
                }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 6 }}>
                    {fillLabel}
                  </Text>
                  <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                    <View style={{ height: 3, width: `${fillPercent * 100}%` as `${number}%`, backgroundColor: COLORS.primary, borderRadius: 2 }} />
                  </View>
                </View>
                <ShiftCard
                  shift={shift}
                  index={i}
                  onPress={() => router.push(`/shift/${shift.id}`)}
                />
              </View>
            );
          })
        )}

        {/* Recent Activity feed */}
        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              Recent Activity
            </Text>
            <AnimatedPressable onPress={() => {}}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                View All
              </Text>
            </AnimatedPressable>
          </View>
          <View style={{ ...glass }}>
            {activityItems.map((item, i) => (
              <View key={i} style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i < activityItems.length - 1 ? 1 : 0,
                borderBottomColor: 'rgba(255,255,255,0.05)',
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', flex: 1 }}>
                  {item.text}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {item.time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* BLAST SHIFT FAB */}
      <Pressable
        onPress={() => router.push('/create-shift')}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 110,
          height: 64,
          zIndex: 999,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: '#00FF85',
          borderRadius: 30,
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 4px 16px rgba(0,255,133,0.5)' }
            : { shadowColor: '#00FF85', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16 }),
          elevation: 999,
        }}
      >
        <MaterialIcons name="bolt" size={20} color="#000" />
        <View>
          <Text style={{ color: '#000', fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, letterSpacing: 1 }}>BLAST SHIFT</Text>
          <Text style={{ color: 'rgba(0,0,0,0.55)', fontFamily: 'SpaceGrotesk-Regular', fontSize: 10 }}>avg 4 min fill</Text>
        </View>
      </Pressable>

    </View>
  );
}

// â”€â”€â”€ Worker Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FILTER_OPTIONS = ['All', 'Tonight', 'Tomorrow', 'This Week'];

const WORKER_TICKER_ITEMS = [
  'âš¡ 3 workers accepted shifts in the last hour',
  '1 shift just filled',
  '2 new shifts posted',
  'âš¡ Bartender confirmed at Prime Social',
  'âœ… Server filled shift at Midtown Tavern',
  'ðŸ”¥ High demand tonight â€” 6 open shifts',
];

// â”€â”€â”€ Available Now helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatUntilTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return isoStr; }
}

function midnightTonight(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
}

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

// â”€â”€â”€ Available Now Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AvailableNowCardProps {
  availableUntil: string | null; // ISO string or null
  onGoLive: () => void;
  onExtend: () => void;
  onGoOffline: () => void;
  loading: boolean;
}

function AvailableNowCard({ availableUntil, onGoLive, onExtend, onGoOffline, loading }: AvailableNowCardProps) {
  const isOn = !!availableUntil && new Date(availableUntil) > new Date();
  const untilText = isOn ? formatUntilTime(availableUntil!) : null;

  if (!isOn) {
    return (
      <View style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
      }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="bolt" size={22} color={COLORS.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
            Not available for rush shifts
          </Text>
        </View>
        <AnimatedPressable onPress={onGoLive} disabled={loading}>
          <View style={{
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            opacity: loading ? 0.6 : 1,
            ...Platform.select({ web: { boxShadow: '0 0 12px rgba(0,255,135,0.4)' }, default: { shadowColor: '#00FF87', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 } }),
          }}>
            <Text style={{ color: '#000', fontSize: 13, fontFamily: 'SpaceGrotesk-Bold' }}>Go Live</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: 'rgba(0,255,135,0.06)',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: 'rgba(0,255,135,0.3)',
      padding: 16,
      marginBottom: 20,
      ...Platform.select({ web: { boxShadow: '0 0 20px rgba(0,255,135,0.12)' }, default: { shadowColor: '#00FF87', shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 } }),
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />
        <Text style={{ color: COLORS.primary, fontSize: 15, fontFamily: 'SpaceGrotesk-Bold', flex: 1 }}>
          ðŸŸ¢ Available until {untilText}
        </Text>
        {loading && <ActivityIndicator color={COLORS.primary} size="small" />}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <AnimatedPressable onPress={onExtend} style={{ flex: 1 }} disabled={loading}>
          <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,135,0.3)' }}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>Extend</Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable onPress={onGoOffline} style={{ flex: 1 }} disabled={loading}>
          <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>Go Offline</Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// â”€â”€â”€ Go Live Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GoLiveModalProps {
  visible: boolean;
  onSelect: (until: Date) => void;
  onCustom: () => void;
  onCancel: () => void;
}

function GoLiveModal({ visible, onSelect, onCustom, onCancel }: GoLiveModalProps) {
  const options = [
    { label: '+2 hours', until: hoursFromNow(2) },
    { label: '+4 hours', until: hoursFromNow(4) },
    { label: 'Until midnight', until: midnightTonight() },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 40, paddingHorizontal: 20 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ color: COLORS.primary, fontSize: 20, fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>Go Live</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 20 }}>
                How long are you available for rush shifts?
              </Text>
              {options.map((opt) => (
                <AnimatedPressable key={opt.label} onPress={() => onSelect(opt.until)}>
                  <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ color: COLORS.text, fontSize: 16, fontFamily: 'SpaceGrotesk-SemiBold' }}>{opt.label}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                      Until {formatUntilTime(opt.until.toISOString())}
                    </Text>
                  </View>
                </AnimatedPressable>
              ))}
              <AnimatedPressable onPress={onCustom}>
                <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,135,0.3)' }}>
                  <Text style={{ color: COLORS.primary, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold' }}>Custom time...</Text>
                </View>
              </AnimatedPressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// â”€â”€â”€ Worker Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WorkerDashboard() {
  const { currentUser, workerProfile, refreshWorkerProfile, demoDataActive } = useRole();
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Available-now state
  const [availableUntil, setAvailableUntil] = useState<string | null>(null);
  const [goLiveModalVisible, setGoLiveModalVisible] = useState(false);
  const [customPickerVisible, setCustomPickerVisible] = useState(false);
  const [customPickerDate, setCustomPickerDate] = useState<Date>(hoursFromNow(2));
  const [hasTemplate, setHasTemplate] = useState(false);

  const tickerScrollRef = useRef<ScrollView>(null);
  const tickerOffset = useRef(0);
  const liveDotOpacity = useRef(new Animated.Value(1)).current;

  const [marketStats, setMarketStats] = useState<FullMarketplaceStats>(_cachedStats);

  useEffect(() => {
    const fetchMarketStats = async () => {
      try {
        const data = await apiGet<FullMarketplaceStats>('/api/marketplace/stats');
        if (data) {
          _cachedStats = { ..._cachedStats, ...data };
          setMarketStats(_cachedStats);
        }
      } catch { /* keep defaults */ }
    };
    fetchMarketStats();
    const interval = setInterval(fetchMarketStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const isAvailable = workerProfile?.isAvailable ?? false;
  const workerName = workerProfile?.name ?? currentUser?.name ?? null;
  const completedShifts = workerProfile?.completedShifts ?? 0;
  const score = workerProfile?.reliabilityScore ?? 0;
  const scoreColor = score >= 95 ? COLORS.primary : score >= 85 ? COLORS.accent : COLORS.danger;
  const earningsEst = completedShifts * 6 * 28;
  const earningsDisplay = '$' + earningsEst.toLocaleString();

  // Load available-now state + template flag
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const data = await authenticatedGet<{ available_now_until?: string | null; availability_template?: Record<string, unknown> }>('/api/worker/availability-template');
        setAvailableUntil(data?.available_now_until ?? null);
        const tmpl = data?.availability_template ?? {};
        const hasTmpl = Object.values(tmpl).some((w: any) => Array.isArray(w) && w.length > 0);
        setHasTemplate(hasTmpl);
      } catch { /* ignore */ }
    };
    loadAvailability();
  }, []);

  // Auto-refresh available-now every 60s to catch expiry
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await authenticatedGet<{ available_now_until?: string | null }>('/api/worker/availability-template');
        const until = data?.available_now_until ?? null;
        setAvailableUntil(until);
        if (until && new Date(until) <= new Date()) setAvailableUntil(null);
      } catch { /* ignore */ }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const setAvailableNow = async (untilDate: Date | null) => {
    setAvailabilityLoading(true);
    try {
      const until = untilDate ? untilDate.toISOString() : null;
      await authenticatedPatch('/api/worker/available-now', { available_until: until });
      setAvailableUntil(until);
      console.log(until ? `[Availability] Go-live: until ${until}` : '[Availability] Go-offline: cleared');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not update availability. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Live dot pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotOpacity, { toValue: 0.2, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(liveDotOpacity, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [liveDotOpacity]);

  // Ticker auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      tickerOffset.current += 1;
      tickerScrollRef.current?.scrollTo({ x: tickerOffset.current, animated: false });
      if (tickerOffset.current > 1800) {
        tickerOffset.current = 0;
        tickerScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const loadShifts = useCallback(async () => {
    if (!user) return;
    if (demoDataActive) {
      setShifts(DEMO_SHIFTS.filter((s) => s.status === 'open'));
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await authenticatedGet<{ shifts: Shift[] }>('/api/shifts?status=open');
      const list = Array.isArray((data as any)?.shifts) ? (data as any).shifts : Array.isArray(data) ? data : [];
      setShifts(list);
    } catch {
      // silently fail â€” UI shows empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoDataActive, user]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const onRefresh = () => { setRefreshing(true); loadShifts(); };

  const handleGoLive = () => setGoLiveModalVisible(true);
  const handleGoLiveSelect = (until: Date) => {
    setGoLiveModalVisible(false);
    setAvailableNow(until);
  };
  const handleGoLiveCustom = () => {
    setGoLiveModalVisible(false);
    setCustomPickerDate(hoursFromNow(2));
    setCustomPickerVisible(true);
  };
  const handleGoOffline = () => setAvailableNow(null);
  const handleExtend = () => setGoLiveModalVisible(true);

  // Legacy toggle (kept for AvailabilityToggle component backward compat)
  const handleToggleAvailability = async () => {
    const canToggle = isAdmin || Boolean(workerProfile?.id);
    if (!canToggle) return;
    if (!workerProfile?.id && isAdmin) return;
    setAvailabilityLoading(true);
    try {
      await authenticatedPatch(`/api/worker-profiles/${workerProfile!.id}/availability`, {
        is_available: !isAvailable,
      });
      await refreshWorkerProfile();
    } catch {
      Alert.alert('Error', 'Could not update availability. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAcceptShift = async (shiftId: string) => {
    if (!currentUser?.id) return;
    setApplyingId(shiftId);
    try {
      await authenticatedPost(`/api/shifts/${shiftId}/apply`, { user_id: currentUser.id });
      Alert.alert('Applied!', 'Your application has been submitted. The manager will confirm shortly.');
      loadShifts();
    } catch {
      Alert.alert('Error', 'Could not apply to this shift. Please try again.');
    } finally {
      setApplyingId(null);
    }
  };

  const filteredShifts = shifts
    .filter((s) => {
      if (activeFilter === 'All') return true;
      return s.urgency?.toLowerCase() === activeFilter.toLowerCase();
    })
    .sort((a, b) => {
      const urgencyOrder: Record<string, number> = { emergency: 0, tonight: 1, high: 2, tomorrow: 3 };
      const aOrder = urgencyOrder[a.urgency ?? ''] ?? 10;
      const bOrder = urgencyOrder[b.urgency ?? ''] ?? 10;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.hourly_pay_cents ?? 0) - (a.hourly_pay_cents ?? 0);
    });

  // Section grouping
  const emergencySection = filteredShifts.filter(
    (s) => s.urgency === 'emergency' || s.urgency === 'tonight'
  );
  const boostedSection = filteredShifts.filter(
    (s) => !(s.urgency === 'emergency' || s.urgency === 'tonight') &&
      (s.hourly_pay_cents ?? 0) >= 3500
  );
  const upcomingSection = filteredShifts.filter(
    (s) => !(s.urgency === 'emergency' || s.urgency === 'tonight') &&
      (s.hourly_pay_cents ?? 0) < 3500
  );

  // Earnings estimate from top 3 shifts
  const top3Shifts = [...filteredShifts].slice(0, 3);
  // hourly_pay_cents / 100 converts to dollars; * 6 estimates a 6-hour shift
  const earningsLow = top3Shifts.reduce((sum, s) => sum + (s.hourly_pay_cents ?? 0) / 100 * 6, 0);
  const earningsHigh = Math.round(earningsLow * 1.2);
  const earningsLowDisplay = '$' + Math.round(earningsLow).toLocaleString();
  const earningsHighDisplay = '$' + earningsHigh.toLocaleString();
  const showEarningsBanner = top3Shifts.length > 0 && earningsLow > 0;

  const shiftCount = filteredShifts.length;

  // recent_activity items are objects { text, time } â€” extract .text for the ticker
  const workerTickerItems = (marketStats.recent_activity && marketStats.recent_activity.length > 0)
    ? marketStats.recent_activity.map((item) => item.text ?? '')
    : WORKER_TICKER_ITEMS;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
                Find Shifts
              </Text>
              {/* LIVE pill */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,133,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, opacity: liveDotOpacity }} />
                <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  LIVE
                </Text>
              </View>
            </View>
            {!!workerName && (
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                {workerName}
              </Text>
            )}
          </View>
          <AnimatedPressable onPress={() => router.push('/notifications')}>
            <View style={{ width: 44, height: 44, ...glass, borderRadius: 22, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="notifications" size={20} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Worker stats strip */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Reliability', value: String(score), color: scoreColor },
            { label: 'Completed', value: String(completedShifts), color: COLORS.text },
            { label: 'Est. Earned', value: earningsDisplay, color: COLORS.accent },
          ].map((stat) => (
            <View key={stat.label} style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 16,
              paddingVertical: 12,
              alignItems: 'center',
            }}>
              <Text style={{ color: stat.color, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
                {stat.value}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', marginTop: 3 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Earnings estimate banner */}
        {showEarningsBanner && (
          <View style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,184,0,0.35)',
            backgroundColor: 'rgba(255,184,0,0.07)',
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
            <Text style={{ fontSize: 22 }}>ðŸ’°</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                Work 3 shifts this week
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                  Estimated earnings:
                </Text>
                <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  {earningsLowDisplay}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {'â€“'}
                </Text>
                <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  {earningsHighDisplay}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Available Now card */}
        <AvailableNowCard
          availableUntil={availableUntil}
          onGoLive={handleGoLive}
          onExtend={handleExtend}
          onGoOffline={handleGoOffline}
          loading={availabilityLoading}
        />

        {/* Rush Feed â€” above regular shifts */}
        <RushFeedSection
          isAvailableNow={!!availableUntil && new Date(availableUntil) > new Date()}
          hasTemplate={hasTemplate}
          onGoToTemplate={() => router.push('/availability-template')}
        />

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginBottom: 20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {FILTER_OPTIONS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <AnimatedPressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
              >
                <View style={{
                  backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.primary : COLORS.border,
                }}>
                  <Text style={{ color: isActive ? '#000' : COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {filter}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Live feed header bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Animated.View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.primary,
              opacity: liveDotOpacity,
            }} />
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              Live
            </Text>
            <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 4 }}>
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                {shiftCount} shifts
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
              Sort: Highest Pay
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={14} color={COLORS.textSecondary} />
          </View>
        </View>

        {/* Shifts moving fast ticker */}
        <View style={{ overflow: 'hidden', marginBottom: 16, marginHorizontal: -20 }}>
          <ScrollView
            ref={tickerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 16, paddingHorizontal: 20 }}
          >
            {[...workerTickerItems, ...workerTickerItems].map((item, i) => (
              <Text key={i} style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular' }}>
                {`${item}  Â·  `}
              </Text>
            ))}
          </ScrollView>
        </View>

        {/* Shifts list */}
        {loading ? (
          <>
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
          </>
        ) : filteredShifts.length === 0 ? (
          <View style={{ ...glass, padding: 40, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name="search" size={28} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>
              No open shifts nearby
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk-Regular' }}>
              Check back soon or tap Go Live to get notified for rush shifts.
            </Text>
          </View>
        ) : (
          <>
            {/* Emergency section */}
            {emergencySection.length > 0 && (
              <>
                <SectionHeader
                  title="ðŸš¨ RUSH COVERAGE"
                  count={emergencySection.length}
                  sectionColor={COLORS.danger}
                  sectionBg="rgba(255,68,68,0.12)"
                />
                {emergencySection.map((shift, i) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    index={i}
                    showAcceptButton
                    onAccept={() => handleAcceptShift(shift.id)}
                    acceptLoading={applyingId === shift.id}
                    onPress={() => router.push(`/shift/${shift.id}`)}
                  />
                ))}
              </>
            )}

            {/* Boosted pay section */}
            {boostedSection.length > 0 && (
              <>
                <SectionHeader
                  title="âš¡ BOOSTED PAY"
                  count={boostedSection.length}
                  sectionColor="#FFD700"
                  sectionBg="rgba(255,215,0,0.10)"
                />
                {boostedSection.map((shift, i) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    index={emergencySection.length + i}
                    showAcceptButton
                    onAccept={() => handleAcceptShift(shift.id)}
                    acceptLoading={applyingId === shift.id}
                    onPress={() => router.push(`/shift/${shift.id}`)}
                  />
                ))}
              </>
            )}

            {/* Upcoming section */}
            {upcomingSection.length > 0 && (
              <>
                <SectionHeader
                  title="UPCOMING SHIFTS"
                  count={upcomingSection.length}
                  sectionColor={COLORS.primary}
                  sectionBg={COLORS.primaryMuted}
                />
                {upcomingSection.map((shift, i) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    index={emergencySection.length + boostedSection.length + i}
                    showAcceptButton
                    onAccept={() => handleAcceptShift(shift.id)}
                    acceptLoading={applyingId === shift.id}
                    onPress={() => router.push(`/shift/${shift.id}`)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Go Live modal */}
      <GoLiveModal
        visible={goLiveModalVisible}
        onSelect={handleGoLiveSelect}
        onCustom={handleGoLiveCustom}
        onCancel={() => setGoLiveModalVisible(false)}
      />

      {/* Custom time picker (iOS modal / Android inline) */}
      {customPickerVisible && (
        Platform.OS === 'android' ? (
          <DateTimePicker
            value={customPickerDate}
            mode="time"
            display="default"
            onChange={(_e: any, d?: Date) => {
              setCustomPickerVisible(false);
              if (d) setAvailableNow(d);
            }}
          />
        ) : (
          <Modal visible={customPickerVisible} transparent animationType="fade" onRequestClose={() => setCustomPickerVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setCustomPickerVisible(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 40, paddingHorizontal: 24 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 }} />
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center', marginBottom: 16 }}>
                      Available until...
                    </Text>
                    <DateTimePicker
                      value={customPickerDate}
                      mode="time"
                      display="spinner"
                      textColor={COLORS.text}
                      themeVariant="dark"
                      onChange={(_e: any, d?: Date) => { if (d) setCustomPickerDate(d); }}
                      style={{ alignSelf: 'center' }}
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                      <AnimatedPressable onPress={() => setCustomPickerVisible(false)} style={{ flex: 1 }}>
                        <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                          <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold' }}>Cancel</Text>
                        </View>
                      </AnimatedPressable>
                      <AnimatedPressable onPress={() => { setCustomPickerVisible(false); setAvailableNow(customPickerDate); }} style={{ flex: 1 }}>
                        <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                          <Text style={{ color: '#000', fontSize: 15, fontFamily: 'SpaceGrotesk-Bold' }}>Go Live</Text>
                        </View>
                      </AnimatedPressable>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )
      )}
    </View>
  );
}

//â”€â”€â”€ Admin Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiGet<Record<string, number>>('/api/admin/stats');
        setStats(data ?? {});
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statItems = [
    { label: 'Total Users', value: stats.total_users ?? 0, color: COLORS.primary },
    { label: 'Total Workers', value: stats.total_workers ?? 0, color: '#60A5FA' },
    { label: 'Businesses', value: stats.total_businesses ?? 0, color: COLORS.accent },
    { label: 'Total Shifts', value: stats.total_shifts ?? 0, color: '#A78BFA' },
    { label: 'Open Shifts', value: stats.open_shifts ?? 0, color: COLORS.primary },
    { label: 'Filled Shifts', value: stats.filled_shifts ?? 0, color: COLORS.primaryDim },
  ];

  const platformHealth = [
    { label: 'Active', value: stats.open_shifts ?? 0, dotColor: COLORS.primary },
    { label: 'Pending', value: stats.pending_shifts ?? 0, dotColor: COLORS.accent },
    { label: 'Issues', value: 0, dotColor: COLORS.danger },
  ];

  const adminTools = [
    { label: 'Worker Verification Queue', iconName: 'verified-user' as const, color: COLORS.primary },
    { label: 'Dispute Management', iconName: 'gavel' as const, color: COLORS.accent },
    { label: 'No-Show Tracking', iconName: 'warning' as const, color: COLORS.danger },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 180 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 2, marginBottom: 6 }}>
          âš¡ ADMIN
        </Text>
        <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
          Admin Dashboard
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {statItems.map((item) => (
          <View key={item.label} style={{ width: '47%', ...glass }}>
            <Text style={{ color: item.color, fontSize: 34, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1 }}>
              {loading ? 'â€”' : item.value}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 4 }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
        Platform Health
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
        {platformHealth.map((item) => (
          <View key={item.label} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.dotColor, marginBottom: 8 }} />
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {loading ? 'â€”' : item.value}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', marginTop: 3 }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
        Quick Actions
      </Text>
      <View style={{ gap: 10, marginBottom: 28 }}>
        {[
          { label: 'View All Workers', iconName: 'people' as const, color: COLORS.primary, route: '/(tabs)/workers' },
          { label: 'View All Businesses', iconName: 'business' as const, color: COLORS.accent, route: '/(tabs)/businesses' },
          { label: 'View All Shifts', iconName: 'trending-up' as const, color: '#60A5FA', route: '/(tabs)/shifts' },
        ].map((action) => (
          <AnimatedPressable key={action.label} onPress={() => router.push(action.route as never)}>
            <View style={{ ...glass, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={action.iconName} size={20} color={action.color} />
              </View>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>
                {action.label}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>
        ))}
      </View>

      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
        Admin Tools
      </Text>
      <View style={{ gap: 10 }}>
        {adminTools.map((tool) => (
          <AnimatedPressable key={tool.label} onPress={() => {}}>
            <View style={{ ...glass, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={tool.iconName} size={20} color={tool.color} />
              </View>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>
                {tool.label}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>
        ))}
      </View>
    </ScrollView>
  );
}

// â”€â”€â”€ Root export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function HomeScreen() {
  const { currentRole, isLoading } = useRole();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32 }}>âš¡</Text>
      </View>
    );
  }

  if (!currentRole) return <LandingScreen />;
  if (currentRole === 'manager') return <ManagerDashboard />;
  if (currentRole === 'worker') return <WorkerDashboard />;
  if (currentRole === 'admin') return <AdminDashboard />;
  return <LandingScreen />;
}
