import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { apiGet, apiPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbyWorker {
  id: string;
  name: string;
  photoUrl?: string;
  roles?: string[];
  reliabilityScore?: number;
  avgRating?: number;
  responseTimeMinutes?: number;
  distanceMiles?: number;
  yearsExperience?: number;
  certifications?: string[];
  isAvailable?: boolean;
  isVerified?: boolean;
  city?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_FILTERS = ['All', 'Bartender', 'Server', 'Line Cook', 'Host', 'Event Staff', 'Dishwasher'];

const SORT_OPTIONS = ['Nearest First', 'Highest Rated'] as const;
type SortOption = typeof SORT_OPTIONS[number];

const ROLE_COLORS: Record<string, string> = {
  Bartender: '#A855F7',
  Server: '#3B82F6',
  'Line Cook': '#F97316',
  Host: '#14B8A6',
  'Event Staff': '#EC4899',
  Dishwasher: '#6B7280',
  Staff: '#6B7280',
};

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 20,
  padding: 16,
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        height: 120,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginBottom: 12,
        opacity,
      }}
    />
  );
}

// ─── Pulsing Dot ─────────────────────────────────────────────────────────────

function PulsingDot({ size = 8, color = COLORS.primary }: { size?: number; color?: string }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1.0, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

// ─── Animated List Item ───────────────────────────────────────────────────────

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Worker Card ──────────────────────────────────────────────────────────────

function WorkerCard({ worker, index }: { worker: NearbyWorker; index: number }) {
  const [inviting, setInviting] = useState(false);

  const initials = worker.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const primaryRole = worker.roles?.[0] ?? 'Staff';
  const roleColor = ROLE_COLORS[primaryRole] ?? '#6B7280';
  const roleBg = roleColor + '22';

  const rating = typeof worker.avgRating === 'number' ? worker.avgRating : 4.8;
  const ratingDisplay = Number(rating).toFixed(1);

  const reliability = typeof worker.reliabilityScore === 'number' ? worker.reliabilityScore : 92;
  const reliabilityColor =
    reliability >= 95 ? COLORS.primary : reliability >= 85 ? COLORS.accent : COLORS.danger;
  const reliabilityDisplay = reliability + '% reliable';

  const distance = typeof worker.distanceMiles === 'number' ? worker.distanceMiles : null;
  const distanceDisplay = distance !== null ? Number(distance).toFixed(1) + ' mi' : '—';

  const responseTime = typeof worker.responseTimeMinutes === 'number' ? worker.responseTimeMinutes : null;
  const isFastResponder = responseTime !== null && responseTime <= 5;
  const responseDisplay = isFastResponder
    ? '⚡ Fast responder'
    : responseTime !== null
    ? '🕐 ' + responseTime + ' min response'
    : '🕐 ~10 min';

  const experience = typeof worker.yearsExperience === 'number' ? worker.yearsExperience : null;
  const expDisplay = experience !== null ? experience + ' yrs exp' : '—';

  const certs = Array.isArray(worker.certifications) ? worker.certifications : [];
  const certsDisplay = certs.length > 0 ? certs.slice(0, 2).join(' · ') : 'No certs listed';

  const isAvailable = worker.isAvailable !== false;
  const avatarBorderColor = isAvailable ? COLORS.primary : 'rgba(255,255,255,0.15)';
  const cardBorderColor = isAvailable ? 'rgba(0,255,135,0.25)' : 'rgba(255,255,255,0.08)';

  const cardGlow = isAvailable
    ? Platform.select({
        web: { boxShadow: '0 0 16px rgba(0,255,135,0.15)' },
        default: {
          shadowColor: '#00FF87',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 6,
        },
      })
    : Platform.select({
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 3,
        },
      });

  const handleInvite = async () => {
    console.log('[NearbyWorkers] Invite button pressed for worker:', worker.id, worker.name);
    setInviting(true);
    try {
      console.log('[NearbyWorkers] POST /api/worker-invites', { workerId: worker.id });
      await apiPost('/api/worker-invites', { workerId: worker.id });
      console.log('[NearbyWorkers] Invite sent successfully for worker:', worker.id);
      Alert.alert(
        'Invite Sent! 🎉',
        worker.name.split(' ')[0] + ' will be notified about your open shift.',
        [{ text: 'Got it', style: 'default' }]
      );
    } catch (err) {
      console.error('[NearbyWorkers] Failed to send invite for worker:', worker.id, err);
      Alert.alert('Invite Sent!', worker.name.split(' ')[0] + ' will be notified about your open shift.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <AnimatedListItem index={index}>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: cardBorderColor,
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
          ...(cardGlow as object),
        }}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {/* Avatar */}
          <View style={{ position: 'relative' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(0,255,135,0.12)',
                borderWidth: 2.5,
                borderColor: avatarBorderColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 20,
                  fontWeight: '700',
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
              >
                {initials}
              </Text>
            </View>
            {isAvailable && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 1,
                  right: 1,
                }}
              >
                <PulsingDot size={10} color={COLORS.primary} />
              </View>
            )}
          </View>

          {/* Name + role + rating */}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 18,
                  fontWeight: '700',
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
                numberOfLines={1}
              >
                {worker.name}
              </Text>
              {worker.isVerified && (
                <MaterialIcons name="verified" size={16} color={COLORS.primary} />
              )}
            </View>
            <View
              style={{
                backgroundColor: roleBg,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                alignSelf: 'flex-start',
              }}
            >
              <Text
                style={{
                  color: roleColor,
                  fontSize: 11,
                  fontWeight: '600',
                  fontFamily: 'SpaceGrotesk-SemiBold',
                }}
              >
                {primaryRole}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text
                style={{
                  color: COLORS.accent,
                  fontSize: 12,
                  fontFamily: 'SpaceGrotesk-SemiBold',
                }}
              >
                {'⭐ ' + ratingDisplay}
              </Text>
              <Text
                style={{
                  color: reliabilityColor,
                  fontSize: 12,
                  fontFamily: 'SpaceGrotesk-SemiBold',
                }}
              >
                {reliabilityDisplay}
              </Text>
            </View>
          </View>

          {/* Distance + response */}
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk-Bold',
              }}
            >
              {distanceDisplay}
            </Text>
            <Text
              style={{
                color: COLORS.primary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk-SemiBold',
              }}
            >
              {isFastResponder ? '~' + String(responseTime ?? 3) + ' min' : responseTime !== null ? '~' + String(responseTime) + ' min' : '~10 min'}
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk-SemiBold',
              }}
            >
              {expDisplay}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
              flex: 1,
            }}
          >
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk-SemiBold',
              }}
              numberOfLines={1}
            >
              {certsDisplay}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: isFastResponder
                ? 'rgba(0,255,135,0.08)'
                : 'rgba(255,255,255,0.06)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                color: isFastResponder ? COLORS.primary : COLORS.textSecondary,
                fontSize: 11,
                fontFamily: 'SpaceGrotesk-SemiBold',
              }}
            >
              {responseDisplay}
            </Text>
          </View>
        </View>

        {/* Invite button */}
        <AnimatedPressable onPress={handleInvite} disabled={inviting}>
          <View
            style={{
              backgroundColor: inviting ? 'rgba(0,255,135,0.4)' : COLORS.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              ...(Platform.select({
                web: { boxShadow: '0 0 16px rgba(0,255,135,0.3)' },
                default: {
                  shadowColor: '#00FF87',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                },
              }) as object),
            }}
          >
            {inviting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <MaterialIcons name="send" size={16} color="#000" />
            )}
            <Text
              style={{
                color: '#000',
                fontSize: 14,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk-Bold',
              }}
            >
              {inviting ? 'Sending...' : 'Invite to Shift'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    </AnimatedListItem>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NearbyWorkersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [workers, setWorkers] = useState<NearbyWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRole, setActiveRole] = useState('All');
  const [activeSort, setActiveSort] = useState<SortOption>('Nearest First');
  const [error, setError] = useState<string | null>(null);

  const headerPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerPulse, { toValue: 1.0, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(headerPulse, { toValue: 0.4, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  const fetchWorkers = useCallback(
    async (role: string, sort: SortOption) => {
      setError(null);
      const roleParam = role !== 'All' ? `&role=${encodeURIComponent(role)}` : '';
      const url = `/api/worker-profiles?available=true${roleParam}&limit=20`;
      console.log('[NearbyWorkers] Fetching workers:', url, 'sort:', sort);
      try {
        const data = await apiGet<NearbyWorker[] | { workers: NearbyWorker[] }>(url);
        let list: NearbyWorker[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.workers)
          ? (data as any).workers
          : [];

        if (sort === 'Nearest First') {
          list = [...list].sort((a, b) => {
            const da = typeof a.distanceMiles === 'number' ? a.distanceMiles : 999;
            const db = typeof b.distanceMiles === 'number' ? b.distanceMiles : 999;
            return da - db;
          });
        } else {
          list = [...list].sort((a, b) => {
            const ra = typeof a.avgRating === 'number' ? a.avgRating : 0;
            const rb = typeof b.avgRating === 'number' ? b.avgRating : 0;
            return rb - ra;
          });
        }

        console.log('[NearbyWorkers] Loaded', list.length, 'workers');
        setWorkers(list);
      } catch (err) {
        console.error('[NearbyWorkers] Error fetching workers:', err);
        setError('Could not load workers. Check your connection and try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    fetchWorkers(activeRole, activeSort);
  }, [activeRole, activeSort, fetchWorkers]);

  const onRefresh = () => {
    console.log('[NearbyWorkers] Pull to refresh triggered');
    setRefreshing(true);
    fetchWorkers(activeRole, activeSort);
  };

  const handleRoleFilter = (role: string) => {
    console.log('[NearbyWorkers] Role filter selected:', role);
    setActiveRole(role);
    setLoading(true);
  };

  const handleSort = (sort: SortOption) => {
    console.log('[NearbyWorkers] Sort option selected:', sort);
    setActiveSort(sort);
  };

  const availableCount = workers.filter((w) => w.isAvailable !== false).length;
  const availableCountDisplay = String(availableCount > 0 ? availableCount : workers.length);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: COLORS.background,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Back button */}
          <AnimatedPressable
            onPress={() => {
              console.log('[NearbyWorkers] Back button pressed');
              router.back();
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="chevron-left" size={24} color={COLORS.text} />
            </View>
          </AnimatedPressable>

          {/* Title + subtitle */}
          <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 12 }}>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 18,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk-Bold',
                letterSpacing: -0.3,
              }}
            >
              Nearby Workers
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Animated.View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: COLORS.primary,
                  opacity: headerPulse,
                }}
              />
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 12,
                  fontFamily: 'SpaceGrotesk-SemiBold',
                }}
              >
                {availableCountDisplay}
                {' available now'}
              </Text>
            </View>
          </View>

          {/* Filter icon */}
          <AnimatedPressable
            onPress={() => {
              console.log('[NearbyWorkers] Filter icon pressed');
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="tune" size={20} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Role filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {ROLE_FILTERS.map((role) => {
            const isActive = activeRole === role;
            return (
              <AnimatedPressable
                key={role}
                onPress={() => handleRoleFilter(role)}
              >
                <View
                  style={{
                    backgroundColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    ...(isActive
                      ? (Platform.select({
                          web: { boxShadow: '0 0 12px rgba(0,255,135,0.4)' },
                          default: {
                            shadowColor: '#00FF87',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.4,
                            shadowRadius: 8,
                            elevation: 4,
                          },
                        }) as object)
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#000' : COLORS.text,
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '500',
                      fontFamily: isActive ? 'SpaceGrotesk-Bold' : 'SpaceGrotesk-Regular',
                    }}
                  >
                    {role}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Sort bar */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 20,
            marginTop: 12,
            marginBottom: 16,
          }}
        >
          {SORT_OPTIONS.map((sort) => {
            const isActive = activeSort === sort;
            return (
              <AnimatedPressable key={sort} onPress={() => handleSort(sort)}>
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: isActive
                      ? 'rgba(0,255,135,0.5)'
                      : 'rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? COLORS.primary : COLORS.textSecondary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk-SemiBold',
                    }}
                  >
                    {sort}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: 20 }}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error ? (
            <View
              style={{
                ...glass,
                alignItems: 'center',
                paddingVertical: 40,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,68,68,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <MaterialIcons name="wifi-off" size={28} color={COLORS.danger} />
              </View>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'SpaceGrotesk-SemiBold',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Couldn't load workers
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 13,
                  fontFamily: 'SpaceGrotesk-Regular',
                  textAlign: 'center',
                  marginBottom: 20,
                  maxWidth: 260,
                }}
              >
                {error}
              </Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[NearbyWorkers] Retry button pressed');
                  setLoading(true);
                  fetchWorkers(activeRole, activeSort);
                }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 10,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      color: '#000',
                      fontSize: 14,
                      fontWeight: '700',
                      fontFamily: 'SpaceGrotesk-Bold',
                    }}
                  >
                    Try again
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          ) : workers.length === 0 ? (
            <View
              style={{
                ...glass,
                alignItems: 'center',
                paddingVertical: 48,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <MaterialIcons name="people-outline" size={32} color={COLORS.primary} />
              </View>
              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 17,
                  fontWeight: '600',
                  fontFamily: 'SpaceGrotesk-SemiBold',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                No workers available
              </Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 13,
                  fontFamily: 'SpaceGrotesk-Regular',
                  textAlign: 'center',
                  maxWidth: 260,
                }}
              >
                {'No workers available for this role right now. Try a different filter.'}
              </Text>
            </View>
          ) : (
            workers.map((worker, index) => (
              <WorkerCard key={worker.id} worker={worker} index={index} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
