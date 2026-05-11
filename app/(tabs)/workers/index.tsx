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
import { Search, Users, Zap } from 'lucide-react-native';

export default function WorkersScreen() {
  const { currentRole } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const loadWorkers = useCallback(async () => {
    try {
      console.log('[WorkersTab] Loading workers...');
      const data = await apiGet<WorkerProfile[]>('/api/worker-profiles');
      setWorkers(Array.isArray(data) ? data : []);
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
    return matchSearch && matchAvail;
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Users size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
          Workers
        </Text>
        <View style={{ marginLeft: 'auto', backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{workers.length}</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 12, height: 48 }}>
        <Search size={18} color={COLORS.textSecondary} />
        <TextInput
          value={search}
          onChangeText={(t) => { console.log('[WorkersTab] Search changed:', t); setSearch(t); }}
          placeholder="Search workers or roles..."
          placeholderTextColor={COLORS.textTertiary}
          style={{ flex: 1, color: COLORS.text, fontSize: 15, marginLeft: 10, fontFamily: 'SpaceGrotesk-Regular' }}
        />
      </View>

      {/* Available Now filter */}
      <AnimatedPressable onPress={() => { console.log('[WorkersTab] Available filter toggled:', !availableOnly); setAvailableOnly(!availableOnly); }}>
        <View style={{ backgroundColor: availableOnly ? COLORS.primaryMuted : COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: availableOnly ? COLORS.primary : COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20, alignSelf: 'flex-start' }}>
          <Zap size={16} color={availableOnly ? COLORS.primary : COLORS.textSecondary} fill={availableOnly ? COLORS.primary : 'none'} />
          <Text style={{ color: availableOnly ? COLORS.primary : COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
            Available Now
          </Text>
        </View>
      </AnimatedPressable>

      {/* Workers list */}
      {loading ? (
        <>
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
        </>
      ) : filtered.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Users size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>No workers found</Text>
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
