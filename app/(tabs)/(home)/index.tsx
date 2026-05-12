import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  Animated,
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

const ACTIVITY_FEED = [
  '⚡ Bartender accepted at Prime Social KC',
  '✅ Server filled shift at Midtown Tavern',
  '🎯 VIP event staffed in 4 minutes',
  '⚡ Line Cook confirmed at Neon Alley',
  '✅ Barback filled at The Copper Mug',
  '⚡ Host confirmed at Rooftop Lounge',
];

const HOW_IT_WORKS = [
  { icon: '🍽', title: 'Post shift', desc: 'Describe the role, time, and pay' },
  { icon: '⚡', title: 'Alert workers', desc: 'Available staff get notified instantly' },
  { icon: '✅', title: 'Fill coverage', desc: 'Confirm the best fit in seconds' },
];

const WHY_BARFLY = [
  { icon: '✓', title: 'Verified Workers', desc: 'Background-checked and rated' },
  { icon: '★', title: 'Reliability Scores', desc: 'Know who shows up' },
  { icon: '⚡', title: 'Emergency Coverage', desc: 'Fill shifts in minutes' },
  { icon: '🍺', title: 'Built for Hospitality', desc: 'Designed for the industry' },
];

const PRICING = [
  { label: 'Emergency Fill', price: '$19', unit: '/shift', desc: 'Per shift filled' },
  { label: 'Starter', price: '$99', unit: '/mo', desc: 'Up to 20 shifts/month' },
  { label: 'Pro', price: '$299', unit: '/mo', desc: 'Unlimited + analytics', featured: true },
];

interface MarketplaceStats {
  workers_available?: number;
  restaurants_hiring?: number;
  shifts_filled_week?: number;
}

function LandingScreen() {
  const { setRole } = useRole();
  const tickerScrollRef = useRef<ScrollView>(null);
  const tickerOffset = useRef(0);
  const [stats, setStats] = useState<MarketplaceStats>({
    workers_available: 31,
    restaurants_hiring: 14,
    shifts_filled_week: 127,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('[Landing] Fetching marketplace stats...');
        const data = await apiGet<MarketplaceStats>('/api/marketplace/stats');
        if (data) setStats(data);
      } catch {
        // fallback to defaults already set
      }
    };
    fetchStats();
  }, []);

  // Auto-scroll ticker
  useEffect(() => {
    const interval = setInterval(() => {
      tickerOffset.current += 1;
      tickerScrollRef.current?.scrollTo({ x: tickerOffset.current, animated: false });
      // Reset when we've scrolled far enough
      if (tickerOffset.current > 2000) {
        tickerOffset.current = 0;
        tickerScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = async (role: 'manager' | 'worker' | 'admin') => {
    console.log('[Landing] Role selected:', role);
    await setRole(role);
  };

  const workersAvailable = stats.workers_available ?? 31;
  const restaurantsHiring = stats.restaurants_hiring ?? 14;
  const shiftsFilled = stats.shifts_filled_week ?? 127;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={{ paddingTop: 72, paddingHorizontal: 24, alignItems: 'center', paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 32 }}>⚡</Text>
          <Text style={{ color: COLORS.primary, fontSize: 38, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1.5 }}>
            Bar-Fly
          </Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 30, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12, lineHeight: 38 }}>
          86'd on staff tonight?
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, fontFamily: 'SpaceGrotesk-Regular', maxWidth: 300, marginBottom: 32 }}>
          Instantly connect with verified hospitality workers nearby.
        </Text>

        {/* Live stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28, width: '100%' }}>
          {[
            { value: String(workersAvailable), label: 'workers nearby' },
            { value: String(restaurantsHiring), label: 'hiring tonight' },
            { value: String(shiftsFilled), label: 'filled this week' },
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ color: COLORS.primary, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1 }}>
                {stat.value}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: 3 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Activity ticker */}
        <View style={{ width: '100%', overflow: 'hidden', marginBottom: 32 }}>
          <ScrollView
            ref={tickerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 20, paddingHorizontal: 4 }}
          >
            {[...ACTIVITY_FEED, ...ACTIVITY_FEED].map((item, i) => (
              <View key={i} style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {item}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* CTA Buttons */}
        <View style={{ gap: 12, width: '100%', marginBottom: 40 }}>
          <AnimatedPressable onPress={() => handleRoleSelect('manager')}>
            <View style={{
              backgroundColor: COLORS.primary,
              borderRadius: 14,
              paddingVertical: 18,
              alignItems: 'center',
              ...primaryGlow,
            }}>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                I'm a Manager — Blast a Shift
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => handleRoleSelect('worker')}>
            <View style={{ ...glass, paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                I'm a Worker — Find Work Tonight
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => handleRoleSelect('admin')}>
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                Admin Access
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* How it works */}
      <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 16, letterSpacing: -0.3 }}>
          How it works
        </Text>
        <View style={{ gap: 10 }}>
          {HOW_IT_WORKS.map((step, i) => (
            <View key={i} style={{ ...glass, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{step.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                  {step.title}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                  {step.desc}
                </Text>
              </View>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  {i + 1}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Why Bar-Fly */}
      <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 16, letterSpacing: -0.3 }}>
          Why Bar-Fly
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {WHY_BARFLY.map((item) => (
            <View key={item.title} style={{ width: '47%', ...glass }}>
              <Text style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</Text>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 4 }}>
                {item.title}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 18 }}>
                {item.desc}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pricing */}
      <View style={{ paddingHorizontal: 24, marginBottom: 40 }}>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 16, letterSpacing: -0.3 }}>
          Simple pricing
        </Text>
        <View style={{ gap: 10 }}>
          {PRICING.map((plan) => (
            <View
              key={plan.label}
              style={{
                ...glass,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                ...(plan.featured ? { borderColor: 'rgba(0, 255, 135, 0.3)', ...primaryGlow } : {}),
              }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {plan.label}
                  </Text>
                  {plan.featured && (
                    <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: COLORS.primary, fontSize: 10, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                        POPULAR
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                  {plan.desc}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
                <Text style={{ color: COLORS.primary, fontSize: 24, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
                  {plan.price}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {plan.unit}
                </Text>
              </View>
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

function WorkerMiniCard({ worker }: { worker: WorkerMini }) {
  const initials = worker.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const primaryRole = worker.roles?.[0] ?? 'Staff';

  return (
    <View style={{
      width: 80,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryMuted,
        borderWidth: 2,
        borderColor: worker.isAvailable ? COLORS.primary : COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
      }}>
        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
          {initials}
        </Text>
      </View>
      <Text style={{ color: COLORS.text, fontSize: 10, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center' }} numberOfLines={1}>
        {worker.name.split(' ')[0]}
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: 2 }} numberOfLines={1}>
        {primaryRole}
      </Text>
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

  // Emergency banner pulse animation
  const emergencyPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyPulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        Animated.timing(emergencyPulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [emergencyPulse]);

  const firstName = currentUser?.name?.split(' ')[0] ?? 'Manager';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const loadData = useCallback(async () => {
    try {
      console.log('[ManagerDashboard] Loading shifts...');
      const [shiftsData, workersData] = await Promise.all([
        apiGet<{ shifts: Shift[] }>('/api/shifts?role=manager'),
        apiGet<WorkerMini[]>('/api/worker-profiles?available=true').catch(() => []),
      ]);
      const shiftList = Array.isArray((shiftsData as any)?.shifts) ? (shiftsData as any).shifts : Array.isArray(shiftsData) ? shiftsData : [];
      setShifts(shiftList);
      const open = shiftList.filter((s: Shift) => s.status === 'open').length;
      const filled = shiftList.filter((s: Shift) => s.status === 'filled').length;
      const confirmed = shiftList.filter((s: Shift) => s.status === 'pending').length;
      setStats({ open, filled, confirmed });
      setNearbyWorkers(Array.isArray(workersData) ? workersData : []);
    } catch (err) {
      console.error('[ManagerDashboard] Error loading shifts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const activeShifts = shifts.filter((s) => s.status === 'open' || s.status === 'pending');
  const recentShifts = shifts.filter((s) => s.status === 'filled' || s.status === 'completed');
  const emergencyShifts = activeShifts.filter((s) => s.urgency === 'emergency' || s.urgency === 'tonight');
  const hasEmergency = emergencyShifts.length > 0;

  const displayedWorkers = nearbyWorkers.slice(0, 5);
  const extraWorkers = nearbyWorkers.length > 5 ? nearbyWorkers.length - 5 : 0;

  const statCards = [
    { label: 'Open Shifts', value: stats.open, color: COLORS.primary, borderColor: COLORS.primary },
    { label: 'Filled Today', value: stats.filled, color: COLORS.accent, borderColor: COLORS.accent },
    { label: 'Confirmed', value: stats.confirmed, color: '#60A5FA', borderColor: '#60A5FA' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <View>
            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 1.5, marginBottom: 4 }}>
              ⚡ BAR-FLY
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
              {greeting},
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
                {firstName}
              </Text>
              <Text style={{ fontSize: 22 }}>👋</Text>
            </View>
          </View>
          <AnimatedPressable onPress={() => console.log('[ManagerDashboard] Notifications pressed')}>
            <View style={{ width: 44, height: 44, borderRadius: 22, ...glass, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
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
                  You have {emergencyShifts.length} open emergency shift{emergencyShifts.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <AnimatedPressable onPress={() => { console.log('[ManagerDashboard] Fill Now pressed'); router.push('/create-shift'); }}>
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

        {/* Quick Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginBottom: 28 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          <AnimatedPressable onPress={() => { console.log('[ManagerDashboard] Emergency Shift pressed'); router.push('/create-shift'); }}>
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
          <AnimatedPressable onPress={() => console.log('[ManagerDashboard] Repost Last pressed')}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>↩</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Repost Last
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => { console.log('[ManagerDashboard] View Workers pressed'); router.push('/(tabs)/workers'); }}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>👥</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                View Workers
              </Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => console.log('[ManagerDashboard] Invite Staff pressed')}>
            <View style={{ ...glass, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>✉</Text>
              <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Invite Staff
              </Text>
            </View>
          </AnimatedPressable>
        </ScrollView>

        {/* Nearby Available Workers */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              Available Now
            </Text>
            {nearbyWorkers.length > 0 && (
              <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  {nearbyWorkers.length}
                </Text>
              </View>
            )}
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
                <View style={{
                  width: 80,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                    +{extraWorkers}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                    more
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

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
          activeShifts.map((shift, i) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              index={i}
              onPress={() => { console.log('[ManagerDashboard] Shift pressed:', shift.id); router.push(`/shift/${shift.id}`); }}
            />
          ))
        )}

        {/* Recent Activity */}
        {recentShifts.length > 0 && (
          <>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 14, marginTop: 8 }}>
              Recent Activity
            </Text>
            {recentShifts.map((shift, i) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                index={i}
                onPress={() => { console.log('[ManagerDashboard] Recent shift pressed:', shift.id); router.push(`/shift/${shift.id}`); }}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Sticky Blast Shift FAB */}
      <View style={{ position: 'absolute', bottom: 100, left: 20, right: 20 }}>
        <AnimatedPressable onPress={() => { console.log('[ManagerDashboard] Blast Shift FAB pressed'); router.push('/create-shift'); }}>
          <View style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            ...primaryGlow,
          }}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              Blast Shift
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// ─── Worker Dashboard ─────────────────────────────────────────────────────────

const FILTER_OPTIONS = ['All', 'Tonight', 'Tomorrow', 'This Week'];

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

  const isAvailable = workerProfile?.isAvailable ?? false;
  const workerName = workerProfile?.name ?? currentUser?.name ?? null;
  const completedShifts = workerProfile?.completedShifts ?? 0;
  const score = workerProfile?.reliabilityScore ?? 0;
  const scoreColor = score >= 95 ? COLORS.primary : score >= 85 ? COLORS.accent : COLORS.danger;
  const earningsEst = completedShifts * 6 * 28;
  const earningsDisplay = '$' + earningsEst.toLocaleString();

  const loadShifts = useCallback(async () => {
    try {
      console.log('[WorkerDashboard] Loading shifts...');
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
      console.log('[WorkerDashboard] Toggling availability for worker:', workerProfile.id);
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
      console.log('[WorkerDashboard] Applying to shift:', shiftId, 'user:', currentUser.id);
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
              Find Shifts
            </Text>
            {workerName && (
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                {workerName}
              </Text>
            )}
          </View>
          <AnimatedPressable onPress={() => console.log('[WorkerDashboard] Notifications pressed')}>
            <View style={{ width: 44, height: 44, borderRadius: 22, ...glass, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
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
                onPress={() => { console.log('[WorkerDashboard] Filter selected:', filter); setActiveFilter(filter); }}
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
          filteredShifts.map((shift, i) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              index={i}
              showAcceptButton
              onAccept={() => handleAcceptShift(shift.id)}
              acceptLoading={applyingId === shift.id}
              onPress={() => { console.log('[WorkerDashboard] Shift card pressed:', shift.id); router.push(`/shift/${shift.id}`); }}
            />
          ))
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
        console.log('[AdminDashboard] Loading admin stats...');
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
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
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
            onPress={() => { console.log('[AdminDashboard] Quick action pressed:', action.label); router.push(action.route as never); }}
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
            onPress={() => console.log('[AdminDashboard] Admin tool pressed:', tool.label)}
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
