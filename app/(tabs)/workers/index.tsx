import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiGet, apiPatch } from '@/utils/api';
import { WorkerCard, WorkerProfile } from '@/components/WorkerCard';
import { WorkerCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function WorkersScreen() {
  const { currentRole } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const loadWorkers = useCallback(async () => {
    try {
      console.log('[WorkersTab] Loading workers from /api/workers...');
      const data = await apiGet<WorkerProfile[] | { workers: WorkerProfile[] }>('/api/workers');
      const list = Array.isArray(data) ? data : (data as any)?.workers ?? [];
      // Normalize field names
      const normalized = list.map((w: any) => ({
        ...w,
        isAvailable: w.is_available ?? w.isAvailable,
        isVerified: w.is_verified ?? w.isVerified,
        isSuspended: w.is_suspended ?? w.isSuspended,
        reliabilityScore: w.reliability_score ?? w.reliabilityScore ?? 0,
        avgRating: w.avg_rating ?? w.avgRating ?? 0,
        roles: w.roles ?? w.worker_roles?.map((r: any) => r.role) ?? [],
      }));
      setWorkers(normalized);
      console.log('[WorkersTab] Loaded', normalized.length, 'workers');
    } catch (err) {
      console.error('[WorkersTab] Error loading workers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  const onRefresh = () => { setRefreshing(true); loadWorkers(); };

  const handleVerify = async (workerId: string) => {
    try {
      console.log('[WorkersTab] Verifying worker:', workerId);
      await apiPatch(`/api/worker-profiles/${workerId}/verify`, {});
      loadWorkers();
    } catch (err) {
      console.error('[WorkersTab] Error verifying worker:', err);
    }
  };

  const handleSuspend = async (worker: WorkerProfile) => {
    try {
      console.log('[WorkersTab] Suspending/reinstating worker:', worker.id);
      await apiPatch(`/api/worker-profiles/${worker.id}/suspend`, { suspended: !worker.isSuspended });
      loadWorkers();
    } catch (err) {
      console.error('[WorkersTab] Error suspending worker:', err);
    }
  };

  const filtered = workers.filter((w) => {
    const matchSearch = search === '' || w.name?.toLowerCase().includes(search.toLowerCase()) || w.roles?.some((r) => r.toLowerCase().includes(search.toLowerCase()));
    const matchAvail = !availableOnly || w.isAvailable;
    const matchVerified = !verifiedOnly || w.isVerified;
    const matchTopRated = !topRatedOnly || (w.reliabilityScore ?? 0) >= 90;
    return matchSearch && matchAvail && matchVerified && matchTopRated;
  });

  const availableCount = workers.filter((w) => w.isAvailable).length;
  const verifiedCount = workers.filter((w) => w.isVerified).length;
  const topRatedCount = workers.filter((w) => (w.reliabilityScore ?? 0) >= 90).length;

  const statsText = `${availableCount} available · ${verifiedCount} verified · ${topRatedCount} top-rated`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <MaterialIcons name="people" size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
          Workers
        </Text>
        <View style={{ marginLeft: 'auto', backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.2)' }}>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            {workers.length}
          </Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isFocused ? COLORS.primary : 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        marginBottom: 12,
        height: 48,
      }}>
        <MaterialIcons name="search" size={18} color={isFocused ? COLORS.primary : COLORS.textSecondary} />
        <TextInput
          value={search}
          onChangeText={(t) => { console.log('[WorkersTab] Search changed:', t); setSearch(t); }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search workers or roles..."
          placeholderTextColor={COLORS.textTertiary}
          style={{ flex: 1, color: COLORS.text, fontSize: 15, marginLeft: 10, fontFamily: 'SpaceGrotesk-Regular' }}
        />
        {search.length > 0 && (
          <AnimatedPressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={COLORS.textSecondary} />
          </AnimatedPressable>
        )}
      </View>

      {/* Filter chips row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20, marginBottom: 16 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        <AnimatedPressable onPress={() => { console.log('[WorkersTab] Available filter toggled:', !availableOnly); setAvailableOnly(!availableOnly); }}>
          <View style={{
            backgroundColor: availableOnly ? COLORS.primaryMuted : 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: availableOnly ? COLORS.primary : 'rgba(255,255,255,0.08)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}>
            <MaterialIcons name="bolt" size={14} color={availableOnly ? COLORS.primary : COLORS.textSecondary} />
            <Text style={{ color: availableOnly ? COLORS.primary : COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
              Available Now
            </Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable onPress={() => { console.log('[WorkersTab] Verified filter toggled:', !verifiedOnly); setVerifiedOnly(!verifiedOnly); }}>
          <View style={{
            backgroundColor: verifiedOnly ? COLORS.primaryMuted : 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: verifiedOnly ? COLORS.primary : 'rgba(255,255,255,0.08)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}>
            <MaterialIcons name="verified" size={14} color={verifiedOnly ? COLORS.primary : COLORS.textSecondary} />
            <Text style={{ color: verifiedOnly ? COLORS.primary : COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
              Verified
            </Text>
          </View>
        </AnimatedPressable>

        <AnimatedPressable onPress={() => { console.log('[WorkersTab] Top Rated filter toggled:', !topRatedOnly); setTopRatedOnly(!topRatedOnly); }}>
          <View style={{
            backgroundColor: topRatedOnly ? COLORS.accentMuted : 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: topRatedOnly ? COLORS.accent : 'rgba(255,255,255,0.08)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}>
            <MaterialIcons name="star" size={14} color={topRatedOnly ? COLORS.accent : COLORS.textSecondary} />
            <Text style={{ color: topRatedOnly ? COLORS.accent : COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
              Top Rated
            </Text>
          </View>
        </AnimatedPressable>
      </ScrollView>

      {/* Stats bar */}
      {!loading && workers.length > 0 && (
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginBottom: 16 }}>
          {statsText}
        </Text>
      )}

      {/* Workers list */}
      {loading ? (
        <>
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
        </>
      ) : filtered.length === 0 ? (
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          padding: 40,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <MaterialIcons name="people" size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>
            No workers found
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk-Regular' }}>
            Try adjusting your search or filters.
          </Text>
        </View>
      ) : (
        filtered.map((worker, i) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            index={i}
            showAdminActions={currentRole === 'admin'}
            onPress={() => { console.log('[WorkersTab] Worker pressed:', worker.id); router.push(`/worker/${worker.id}`); }}
            onVerify={() => handleVerify(worker.id)}
            onSuspend={() => handleSuspend(worker)}
          />
        ))
      )}
    </ScrollView>
  );
}
