import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { authenticatedGet } from '@/utils/api';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface PublicWorkerProfile {
  id: string;
  name: string;
  bio: string | null;
  city: string;
  created_at: string | null;
  reliability_score: number;
  is_verified: boolean;
  roles: { role: string; years_experience: number; is_primary: boolean }[];
  total_shifts_completed: number;
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
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMemberSince(isoStr: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch { return '—'; }
}

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [worker, setWorker] = useState<PublicWorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      const data = await authenticatedGet<PublicWorkerProfile>(`/api/worker-profiles/${id}/public`);
      setWorker(data);
    } catch (err: any) {
      if (__DEV__) console.error('[WorkerProfile] fetch error:', err?.message);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const headerOptions = {
    title: worker?.name ?? 'Worker Profile',
    headerStyle: { backgroundColor: COLORS.background },
    headerTintColor: COLORS.text,
    headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
    headerLeft: () => (
      <AnimatedPressable onPress={() => router.back()}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <MaterialIcons name="chevron-left" size={24} color={COLORS.text} />
        </View>
      </AnimatedPressable>
    ),
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </>
    );
  }

  if (notFound || !worker) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 20 }}>
          <MaterialIcons name="person-off" size={48} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
            Profile not found.
          </Text>
          <AnimatedPressable onPress={() => router.back()}>
            <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(0,255,135,0.3)' }}>
              <Text style={{ color: COLORS.primary, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>Go Back</Text>
            </View>
          </AnimatedPressable>
        </View>
      </>
    );
  }

  const initials = getInitials(worker.name);
  const score = worker.reliability_score ?? 0;
  const memberSince = formatMemberSince(worker.created_at);
  const lowScoreExplainer = score < 50 ? 'Improving — fewer shifts to date' : null;

  return (
    <>
      <Stack.Screen options={{ ...headerOptions, title: worker.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: avatar + name + city + verified */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: COLORS.primaryMuted,
            borderWidth: 3,
            borderColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            ...primaryGlow,
          }}>
            <Text style={{ color: COLORS.primary, fontSize: 36, fontFamily: 'SpaceGrotesk-Bold' }}>{initials}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Text style={{ color: COLORS.text, fontSize: 26, fontFamily: 'SpaceGrotesk-Bold' }}>{worker.name}</Text>
            {worker.is_verified && (
              <MaterialIcons name="verified" size={22} color={COLORS.primary} />
            )}
          </View>

          {worker.city ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="place" size={14} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{worker.city}</Text>
            </View>
          ) : null}
        </View>

        {/* Reliability score */}
        <View style={{
          ...glass,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
          borderColor: 'rgba(0,255,135,0.2)',
          ...primaryGlow,
        }}>
          <ReliabilityScore score={score} size={80} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 4 }}>
              RELIABILITY SCORE
            </Text>
            <Text style={{ color: COLORS.primary, fontSize: 30, fontFamily: 'SpaceGrotesk-Bold' }}>
              {score}
              <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk-Regular' }}>/100</Text>
            </Text>
            {lowScoreExplainer ? (
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 4 }}>
                {lowScoreExplainer}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, ...glass, alignItems: 'center', padding: 16 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' }}>
              MEMBER SINCE
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center' }}>
              {memberSince}
            </Text>
          </View>
          <View style={{ flex: 1, ...glass, alignItems: 'center', padding: 16 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' }}>
              SHIFTS COMPLETED
            </Text>
            <Text style={{ color: COLORS.primary, fontSize: 22, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center' }}>
              {worker.total_shifts_completed}
            </Text>
          </View>
        </View>

        {/* Bio */}
        <View style={{ ...glass, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>ABOUT</Text>
          </View>
          <Text style={{ color: worker.bio ? COLORS.text : COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>
            {worker.bio ?? 'No bio yet.'}
          </Text>
        </View>

        {/* Roles */}
        {worker.roles.length > 0 ? (
          <View style={{ ...glass, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>ROLES</Text>
            </View>
            <View style={{ gap: 8 }}>
              {worker.roles.map((r, i) => (
                <View key={i} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: r.is_primary ? 'rgba(0,255,135,0.25)' : 'rgba(255,255,255,0.06)',
                  gap: 8,
                }}>
                  {r.is_primary && (
                    <MaterialIcons name="star" size={14} color={COLORS.primary} />
                  )}
                  <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>
                    {capitalize(r.role)}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                    {r.years_experience === 1 ? '1 yr exp' : `${r.years_experience} yrs exp`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Back button footer */}
        <AnimatedPressable onPress={() => router.back()}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            flexDirection: 'row',
            gap: 8,
          }}>
            <MaterialIcons name="arrow-back" size={18} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>Back</Text>
          </View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
