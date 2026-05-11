import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { WorkerCardSkeleton } from '@/components/SkeletonLoader';
import { CheckCircle, MapPin, Star, Car, Briefcase } from 'lucide-react-native';

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

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} color={i <= safeRating ? COLORS.accent : COLORS.textTertiary} fill={i <= safeRating ? COLORS.accent : 'none'} />
      ))}
    </View>
  );
}

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[WorkerDetail] Loading worker:', id);
      const [workerData, ratingsData] = await Promise.all([
        apiGet<WorkerDetail>(`/api/worker-profiles/${id}`),
        apiGet<Rating[]>(`/api/ratings/worker/${id}`).catch(() => []),
      ]);
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
        <Stack.Screen options={{ title: 'Worker Profile' }} />
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
        <Stack.Screen options={{ title: 'Worker Profile' }} />
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

  return (
    <>
      <Stack.Screen options={{ title: worker.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primaryMuted, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ color: COLORS.primary, fontSize: 36, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{initials}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold' }}>{worker.name}</Text>
            {worker.isVerified && <CheckCircle size={18} color={COLORS.primary} fill={COLORS.primary} />}
          </View>
          {worker.city && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{worker.city}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: worker.isAvailable ? COLORS.primary : COLORS.textTertiary }} />
            <Text style={{ color: worker.isAvailable ? COLORS.primary : COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {worker.isAvailable ? 'Available Now' : 'Not Available'}
            </Text>
          </View>
        </View>

        {/* Reliability score */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <ReliabilityScore score={worker.reliabilityScore ?? 0} size={80} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 }}>Reliability Score</Text>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{worker.reliabilityScore ?? 0}/100</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <StarRating rating={avgRating} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                {avgRating > 0 ? avgRating.toFixed(1) : '—'} avg
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Completed', value: worker.completedShifts ?? 0 },
            { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—' },
            { label: 'Cancellations', value: worker.cancellations ?? 0 },
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}>
              <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{stat.value}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: 4 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Roles */}
        {roles.length > 0 && (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 10 }}>ROLES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {roles.map((role) => (
                <View key={role} style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{role}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bio */}
        {worker.bio && (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 8 }}>BIO</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>{worker.bio}</Text>
          </View>
        )}

        {/* Details */}
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 12 }}>DETAILS</Text>
          {[
            { icon: <Briefcase size={16} color={COLORS.textSecondary} />, label: 'Experience', value: worker.yearsExperience ? `${worker.yearsExperience} years` : '—' },
            { icon: <Car size={16} color={COLORS.textSecondary} />, label: 'Transportation', value: worker.hasTransportation ? 'Has own transport' : 'No transport listed' },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 10 }}>
              {item.icon}
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 120 }}>{item.label}</Text>
              <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Certifications */}
        {certs.length > 0 && (
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 10 }}>CERTIFICATIONS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {certs.map((cert) => (
                <View key={cert} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
                  <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ratings */}
        {ratings.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
              Reviews ({ratings.length})
            </Text>
            {ratings.map((r) => (
              <View key={r.id} style={{ backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {r.manager_name ?? 'Manager'}
                  </Text>
                  <StarRating rating={r.rating} />
                </View>
                {r.shift_role && (
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 6 }}>
                    {r.shift_role}
                  </Text>
                )}
                {r.comment && (
                  <Text style={{ color: COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 20 }}>{r.comment}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}
