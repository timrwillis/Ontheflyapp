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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiGet, apiPost, apiPatch } from '@/utils/api';
import { ShiftCard, Shift } from '@/components/ShiftCard';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ShiftCardSkeleton } from '@/components/SkeletonLoader';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// ─── Shared glass style ───────────────────────────────────────────────────────

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

// ─── Landing Screen ───────────────────────────────────────────────────────────

const FALLBACK_ACTIVITY_FEED = [
  '⚡ Bartender accepted at Prime Social KC',
  '✅ Server filled shift at Midtown Tavern',
  '🎯 VIP event staffed in 4 minutes',
  '⚡ Line Cook confirmed at Neon Alley',
  '✅ Barback filled at The Copper Mug',
  '⚡ Host confirmed at Rooftop Lounge',
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

function LandingScreen() {
  const { setRole } = useRole();
  const router = useRouter();
  const tickerScrollRef = useRef<ScrollView>(null);
  const tickerOffset = useRef(0);
  const dotOpacity = useRef(new Animated.Value(1)).current;
  const [stats, setStats] = useState<MarketplaceStats>({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiGet<MarketplaceStats>('/api/marketplace/stats');
        if (data) setStats(data);
      } catch {
        // fallback to defaults already set
      }
    };
    fetchStats();
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
    if (role === 'manager') {
      router.push('/onboarding/manager/profile' as any);
    } else {
      router.push('/onboarding/worker/index' as any);
    }
  };

  const workersAvailable = stats.workers_available ?? 31;
  const restaurantsHiring = stats.restaurants_hiring ?? 14;
  const shiftsFilled = stats.shifts_filled_this_week ?? 127;

  const activityFeed = stats.recent_activity?.length
    ? stats.recent_activity.map((item, i) => (i % 2 === 0 ? '✅ ' : '⚡ ') + item.text)
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
          <Text style={{ fontSize: 28 }}>⚡</Text>
          <Text style={{ color: COLORS.primary, fontSize: 34, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1.5 }}>
            On The Fly
          </Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', letterSpacing: -0.5, marginBottom: 28, lineHeight: 34 }}>
          Fill the floor fast.
        </Text>

        {/* Live stats row */}
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
                  <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, opacity: dotOpacity }} />
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {firstWord}
                  </Text>
                  <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                    {rest}
                  </Text>
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
                I'm a Manager — Blast a Shift
              </Text>
            </View>
          </AnimatedPressable>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: -6 }}>
            avg 4 min fill time
          </Text>
          <AnimatedPressable onPress={() => handleRoleSelect('worker')}>
            <View style={{ ...glass, paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                I'm a Worker — Find Work Tonight
              </Text>
            </View>
          </AnimatedPressable>
          <Text style={{ color: COLORS.primary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: -6 }}>
            Shifts available now →
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

// ─── Worker Mini Card ─────────────────────────────────────────────────────────

interface WorkerMini {
  id: string;
  name: string;
  roles?: string[];
  isAvailable?: boolean;
}

const SCARCITY_INSIGHTS = [
  { icon: '🟢', text: '12 workers online now' },
  { icon: '🔴', text: 'Only 4 bartenders available' },
  { icon: '⚡', text: 'High demand tonight' },
  { icon: '🏃', text: '3 responded in 5 min' },
  { icon: '📈', text: 'Weekend rush active' },
  { icon: '🎯', text: '94% fill rate this week' },
];

const FALLBACK_ACTIVITY_ITEMS = [
  { icon: '✅', text: 'Bartender confirmed at Prime Social KC', time: '2m ago', color: COLORS.primary },
  { icon: '⚡', text: 'Server accepted shift at Midtown Tavern', time: '8m ago', color: COLORS.accent },
  { icon: '🎯', text: 'VIP event fully staffed in 4 minutes', time: '23m ago', color: '#60A5FA' },
  { icon: '✅', text: 'Line Cook filled at Neon Alley', time: '41m ago', color: COLORS.primary },
  { icon: '⚡', text: 'Rush coverage filled at Velvet Room', time: '1h ago', color: COLORS.accent },
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
        {'⭐ ' + ratingDisplay}
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

// ─── Section Header ───────────────────────────────────────────────────────────

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

// ─── Manager Dashboard ────────────────────────────────────────────────────────

function ManagerDashboard() {
  const { currentUser } = useRole();
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
    try {
      const [shiftsData, workersData, marketplaceData] = await Promise.all([
        apiGet<{ shifts: Shift[] }>('/api/shifts?role=manager'),
        apiGet<WorkerMini[]>('/api/worker-profiles?available=true').catch(() => []),
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
        const ITEM_ICONS = ['✅', '⚡', '🎯', '✅', '⚡'];
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
  }, []);

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
              ⚡ ON THE FLY
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
              {`${greeting},`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
                {firstName}
              </Text>
              <Text style={{ fontSize: 22 }}>👋</Text>
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
                <Text style={{ fontSize: 18 }}>🚨</Text>
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
                  Fill Now →
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
          {SCARCITY_INSIGHTS.map((insight, i) => (
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
              <Text style={{ fontSize: 14 }}>🚨</Text>
              <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Emergency Shift
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => {}}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>↩</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Repost Last
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => router.push('/(tabs)/workers')}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>👥</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                View Workers
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => {}}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>✉</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Invite Staff
              </Text>
            </View>
          </AnimatedPressable>
        </ScrollView>

        {/* Available Now — upgraded header */}
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
                Browse All →
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
            const fillLabel = shiftRole + ' · Tonight · ' + workersConfirmed + '/' + workersNeeded + ' filled';
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

// ─── Worker Dashboard ─────────────────────────────────────────────────────────

const FILTER_OPTIONS = ['All', 'Tonight', 'Tomorrow', 'This Week'];

const WORKER_TICKER_ITEMS = [
  '⚡ 3 workers accepted shifts in the last hour',
  '1 shift just filled',
  '2 new shifts posted',
  '⚡ Bartender confirmed at Prime Social',
  '✅ Server filled shift at Midtown Tavern',
  '🔥 High demand tonight — 6 open shifts',
];

function WorkerDashboard() {
  const { currentUser, workerProfile, refreshWorkerProfile } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const tickerScrollRef = useRef<ScrollView>(null);
  const tickerOffset = useRef(0);
  const liveDotOpacity = useRef(new Animated.Value(1)).current;

  const isAvailable = workerProfile?.isAvailable ?? false;
  const workerName = workerProfile?.name ?? currentUser?.name ?? null;
  const completedShifts = workerProfile?.completedShifts ?? 0;
  const score = workerProfile?.reliabilityScore ?? 0;
  const scoreColor = score >= 95 ? COLORS.primary : score >= 85 ? COLORS.accent : COLORS.danger;
  const earningsEst = completedShifts * 6 * 28;
  const earningsDisplay = '$' + earningsEst.toLocaleString();

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
    try {
      const data = await apiGet<{ shifts: Shift[] }>('/api/shifts?status=open');
      const list = Array.isArray((data as any)?.shifts) ? (data as any).shifts : Array.isArray(data) ? data : [];
      setShifts(list);
    } catch (err) {
      console.error('[WorkerDashboard] Error loading shifts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const onRefresh = () => { setRefreshing(true); loadShifts(); };

  const handleToggleAvailability = async () => {
    if (!workerProfile?.id) return;
    setAvailabilityLoading(true);
    try {
      await apiPatch(`/api/worker-profiles/${workerProfile.id}/availability`, {
        is_available: !isAvailable,
      });
      await refreshWorkerProfile();
    } catch (err) {
      console.error('[WorkerDashboard] Error toggling availability:', err);
      Alert.alert('Error', 'Could not update availability. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAcceptShift = async (shiftId: string) => {
    if (!currentUser?.id) return;
    setApplyingId(shiftId);
    try {
      await apiPost(`/api/shifts/${shiftId}/apply`, { user_id: currentUser.id });
      Alert.alert('Applied!', 'Your application has been submitted. The manager will confirm shortly.');
      loadShifts();
    } catch (err) {
      console.error('[WorkerDashboard] Error applying to shift:', err);
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
      return Number(b.hourly_pay ?? b.hourlyPay ?? 0) - Number(a.hourly_pay ?? a.hourlyPay ?? 0);
    });

  // Section grouping
  const emergencySection = filteredShifts.filter(
    (s) => s.urgency === 'emergency' || s.urgency === 'tonight'
  );
  const boostedSection = filteredShifts.filter(
    (s) => !(s.urgency === 'emergency' || s.urgency === 'tonight') &&
      Number(s.hourly_pay ?? s.hourlyPay ?? 0) >= 35
  );
  const upcomingSection = filteredShifts.filter(
    (s) => !(s.urgency === 'emergency' || s.urgency === 'tonight') &&
      Number(s.hourly_pay ?? s.hourlyPay ?? 0) < 35
  );

  // Earnings estimate from top 3 shifts
  const top3Shifts = [...filteredShifts].slice(0, 3);
  const earningsLow = top3Shifts.reduce((sum, s) => sum + Number(s.hourly_pay ?? s.hourlyPay ?? 0) * 6, 0);
  const earningsHigh = Math.round(earningsLow * 1.2);
  const earningsLowDisplay = '$' + Math.round(earningsLow).toLocaleString();
  const earningsHighDisplay = '$' + earningsHigh.toLocaleString();
  const showEarningsBanner = top3Shifts.length > 0 && earningsLow > 0;

  const shiftCount = filteredShifts.length;

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
            {workerName && (
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
            <Text style={{ fontSize: 22 }}>💰</Text>
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
                  {'–'}
                </Text>
                <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  {earningsHighDisplay}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Availability toggle */}
        <View style={{ marginBottom: 20 }}>
          <AvailabilityToggle
            isAvailable={isAvailable}
            onToggle={handleToggleAvailability}
            loading={availabilityLoading}
          />
        </View>

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
            {[...WORKER_TICKER_ITEMS, ...WORKER_TICKER_ITEMS].map((item, i) => (
              <Text key={i} style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular' }}>
                {`${item}  ·  `}
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
              Check back soon or toggle Available Now to get notified.
            </Text>
          </View>
        ) : (
          <>
            {/* Emergency section */}
            {emergencySection.length > 0 && (
              <>
                <SectionHeader
                  title="🚨 RUSH COVERAGE"
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
                  title="⚡ BOOSTED PAY"
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
    </View>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

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
      } catch (err) {
        console.error('[AdminDashboard] Error loading stats:', err);
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
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 2, marginBottom: 6 }}>
          ⚡ ADMIN
        </Text>
        <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
          Admin Dashboard
        </Text>
      </View>

      {/* Stats grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {statItems.map((item) => (
          <View key={item.label} style={{ width: '47%', ...glass }}>
            <Text style={{ color: item.color, fontSize: 34, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1 }}>
              {loading ? '—' : item.value}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 4 }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Platform Health */}
      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
        Platform Health
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
        {platformHealth.map((item) => (
          <View key={item.label} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.dotColor, marginBottom: 8 }} />
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {loading ? '—' : item.value}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', marginTop: 3 }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
        Quick Actions
      </Text>
      <View style={{ gap: 10, marginBottom: 28 }}>
        {[
          { label: 'View All Workers', iconName: 'people' as const, color: COLORS.primary, route: '/(tabs)/workers' },
          { label: 'View All Businesses', iconName: 'business' as const, color: COLORS.accent, route: '/(tabs)/businesses' },
          { label: 'View All Shifts', iconName: 'trending-up' as const, color: '#60A5FA', route: '/(tabs)/shifts' },
        ].map((action) => (
          <AnimatedPressable
            key={action.label}
            onPress={() => router.push(action.route as never)}
          >
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

      {/* Admin Tools */}
      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
        Admin Tools
      </Text>
      <View style={{ gap: 10 }}>
        {adminTools.map((tool) => (
          <AnimatedPressable
            key={tool.label}
            onPress={() => {}}
          >
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

// ─── Root export ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { currentRole, isLoading } = useRole();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32 }}>⚡</Text>
      </View>
    );
  }

  if (!currentRole) return <LandingScreen />;
  if (currentRole === 'manager') return <ManagerDashboard />;
  if (currentRole === 'worker') return <WorkerDashboard />;
  if (currentRole === 'admin') return <AdminDashboard />;
  return <LandingScreen />;
}
