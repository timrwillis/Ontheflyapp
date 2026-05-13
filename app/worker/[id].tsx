import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Platform, Animated, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { WorkerCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface WorkerDetail {
  id: string;
  name: string;
  city?: string;
  roles?: string[];
  reliabilityScore?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  bio?: string;
  yearsExperience?: number;
  certifications?: string[];
  hasTransportation?: boolean;
  completedShifts?: number;
  avgRating?: number;
  cancellations?: number;
}

interface Rating {
  id: string;
  rating: number;
  comment?: string;
  manager_name?: string;
  shift_role?: string;
  created_at?: string;
}

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
}) as object;

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons
          key={i}
          name="star"
          size={14}
          color={i <= safeRating ? COLORS.accent : COLORS.textTertiary}
        />
      ))}
    </View>
  );
}

function PulsingDot() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1.0, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        opacity,
      }}
    />
  );
}

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[WorkerDetail] Loading worker:', id);
      const [workerData, ratingsData] = await Promise.all([
        apiGet<WorkerDetail>(`/api/workers/${id}`),
        apiGet<Rating[]>(`/api/ratings/worker/${id}`).catch(() => []),
      ]);
      // Normalize field names
      if (workerData) {
        (workerData as any).isAvailable = (workerData as any).is_available ?? (workerData as any).isAvailable;
        (workerData as any).isVerified = (workerData as any).is_verified ?? (workerData as any).isVerified;
        (workerData as any).reliabilityScore = (workerData as any).reliability_score ?? (workerData as any).reliabilityScore ?? 0;
        (workerData as any).avgRating = (workerData as any).avg_rating ?? (workerData as any).avgRating ?? 0;
        (workerData as any).hasTransportation = (workerData as any).has_transportation ?? (workerData as any).hasTransportation;
        (workerData as any).roles = (workerData as any).roles ?? (workerData as any).worker_roles?.map((r: any) => r.role) ?? [];
      }
      setWorker(workerData);
      setRatings(Array.isArray(ratingsData) ? ratingsData : []);
    } catch (err) {
      console.error('[WorkerDetail] Error loading worker:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{
          title: 'Worker Profile',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        }} />
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ padding: 20 }}>
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
        </ScrollView>
      </>
    );
  }

  if (!worker) {
    return (
      <>
        <Stack.Screen options={{
          title: 'Worker Profile',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        }} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk-Regular' }}>Worker not found</Text>
        </View>
      </>
    );
  }

  const initials = getInitials(worker.name);
  const roles = worker.roles ?? [];
  const certs = worker.certifications ?? [];
  const avgRating = Number(worker.avgRating) || 0;
  const avgRatingDisplay = avgRating > 0 ? avgRating.toFixed(1) : '—';
  const completedShifts = worker.completedShifts ?? 0;
  const cancellations = worker.cancellations ?? 0;
  const reliabilityScore = worker.reliabilityScore ?? 0;
  const experienceDisplay = worker.yearsExperience ? `${worker.yearsExperience} years` : '—';
  const transportDisplay = worker.hasTransportation ? 'Has own transport' : 'No transport listed';
  const availabilityText = worker.isAvailable ? 'Available Tonight' : 'Not Available';
  const availabilityColor = worker.isAvailable ? COLORS.primary : COLORS.textSecondary;
  const availabilityBg = worker.isAvailable ? COLORS.primaryMuted : 'rgba(255,255,255,0.06)';

  return (
    <>
      <Stack.Screen options={{
        title: worker.name,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        headerLeft: () => (
          <AnimatedPressable onPress={() => { console.log('[WorkerDetail] Back button pressed'); router.back(); }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <MaterialIcons name="chevron-left" size={24} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        ),
      }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name hero */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          {/* Avatar with neon ring */}
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: COLORS.primaryMuted,
              borderWidth: 3,
              borderColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              ...primaryGlow,
            }}>
              <Text style={{ color: COLORS.primary, fontSize: 38, fontFamily: 'SpaceGrotesk-Bold' }}>{initials}</Text>
            </View>
            {worker.isAvailable && (
              <View style={{ position: 'absolute', bottom: 2, right: 2 }}>
                <PulsingDot />
              </View>
            )}
          </View>

          {/* Name + verified */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Text style={{ color: COLORS.text, fontSize: 24, fontFamily: 'SpaceGrotesk-Bold' }}>{worker.name}</Text>
            {worker.isVerified && (
              <MaterialIcons name="verified" size={20} color={COLORS.primary} />
            )}
          </View>

          {/* City */}
          {worker.city ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <MaterialIcons name="place" size={14} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{worker.city}</Text>
            </View>
          ) : null}

          {/* Availability pill */}
          <View style={{ backgroundColor: availabilityBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: worker.isAvailable ? 'rgba(0,255,135,0.3)' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: availabilityColor }} />
            <Text style={{ color: availabilityColor, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>{availabilityText}</Text>
          </View>
        </View>

        {/* Reliability score card — prominent */}
        <View style={{
          ...glass,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
          borderColor: 'rgba(0,255,135,0.2)',
          ...primaryGlow,
        }}>
          <ReliabilityScore score={reliabilityScore} size={88} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 4 }}>RELIABILITY SCORE</Text>
            <Text style={{ color: COLORS.primary, fontSize: 28, fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>
              {reliabilityScore}
              <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk-Regular' }}>/100</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <StarRating rating={avgRating} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                {avgRatingDisplay}
                {' avg'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Completed', value: String(completedShifts), color: COLORS.primary },
            { label: 'Avg Rating', value: avgRatingDisplay, color: COLORS.accent },
            { label: 'Cancellations', value: String(cancellations), color: cancellations > 3 ? COLORS.danger : COLORS.textSecondary },
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, ...glass, alignItems: 'center', padding: 14 }}>
              <Text style={{ color: stat.color, fontSize: 22, fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>{stat.value}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Roles */}
        {roles.length > 0 ? (
          <View style={{ ...glass, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>ROLES</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {roles.map((role) => (
                <View key={role} style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>{role}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bio */}
        {worker.bio ? (
          <View style={{ ...glass, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>BIO</Text>
            </View>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>{worker.bio}</Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={{ ...glass, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>DETAILS</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 10 }}>
            <MaterialIcons name="work" size={16} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 120 }}>Experience</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{experienceDisplay}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
            <MaterialIcons name="directions-car" size={16} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 120 }}>Transportation</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{transportDisplay}</Text>
          </View>
        </View>

        {/* Certifications */}
        {certs.length > 0 ? (
          <View style={{ ...glass, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.accent }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>CERTIFICATIONS</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {certs.map((cert) => (
                <View key={cert} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' }}>
                  <MaterialIcons name="star" size={12} color={COLORS.accent} />
                  <Text style={{ color: COLORS.accent, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Ratings */}
        {ratings.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: COLORS.primary }} />
              <Text style={{ color: COLORS.text, fontSize: 18, fontFamily: 'SpaceGrotesk-Bold' }}>
                {'Reviews ('}
                {ratings.length}
                {')'}
              </Text>
            </View>
            {ratings.map((r) => (
              <View key={r.id} style={{ ...glass, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {r.manager_name ?? 'Manager'}
                  </Text>
                  <StarRating rating={r.rating} />
                </View>
                {r.shift_role ? (
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 6 }}>
                    {r.shift_role}
                  </Text>
                ) : null}
                {r.comment ? (
                  <Text style={{ color: COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 20 }}>{r.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Invite to Shift CTA */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 32,
        paddingTop: 16,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
      }}>
        <AnimatedPressable onPress={() => {
          console.log('[WorkerDetail] Invite to Shift pressed for worker:', worker.id, worker.name);
          Alert.alert('Invite Sent!', `${worker.name} will be notified about your open shift.`);
        }}>
          <View style={{
            backgroundColor: COLORS.primary,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 10,
            ...primaryGlow,
          }}>
            <MaterialIcons name="send" size={18} color="#000" />
            <Text style={{ color: '#000', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>Invite to Shift</Text>
          </View>
        </AnimatedPressable>
      </View>
    </>
  );
}
