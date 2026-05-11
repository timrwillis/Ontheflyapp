import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiGet } from '@/utils/api';
import { ShiftCard, Shift } from '@/components/ShiftCard';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { ShiftCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const MANAGER_TABS = ['Open', 'Pending', 'Filled', 'Completed'];
const WORKER_TABS = ['Upcoming', 'Completed'];

function SegmentedControl({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 4, marginBottom: 20 }}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <AnimatedPressable key={opt} onPress={() => { console.log('[ShiftsTab] Segment selected:', opt); onSelect(opt); }} style={{ flex: 1 }}>
            <View style={{ backgroundColor: isActive ? COLORS.surface : 'transparent', borderRadius: 9, paddingVertical: 8, alignItems: 'center', borderWidth: isActive ? 1 : 0, borderColor: COLORS.border }}>
              <Text style={{ color: isActive ? COLORS.text : COLORS.textSecondary, fontSize: 13, fontWeight: isActive ? '600' : '400', fontFamily: isActive ? 'SpaceGrotesk-SemiBold' : 'SpaceGrotesk-Regular' }}>
                {opt}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export default function ShiftsScreen() {
  const { currentRole, currentUser, workerProfile } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(currentRole === 'worker' ? 'Upcoming' : 'Open');

  const loadShifts = useCallback(async () => {
    try {
      if (currentRole === 'worker' && currentUser?.id) {
        console.log('[ShiftsTab] Loading worker applications for user:', currentUser.id);
        const data = await apiGet<{ shift?: Shift; status?: string }[]>(`/api/my-applications?user_id=${currentUser.id}`);
        const list = Array.isArray(data) ? data : [];
        const mapped: Shift[] = list.map((item) => ({
          ...(item.shift ?? {}),
          status: item.status ?? item.shift?.status,
        } as Shift));
        setShifts(mapped);
      } else {
        console.log('[ShiftsTab] Loading manager shifts...');
        const data = await apiGet<{ shifts: Shift[] }>('/api/shifts?role=manager');
        const shiftList = Array.isArray((data as any)?.shifts) ? (data as any).shifts : Array.isArray(data) ? data : [];
        setShifts(shiftList);
      }
    } catch (err) {
      console.error('[ShiftsTab] Error loading shifts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentRole, currentUser]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const onRefresh = () => { setRefreshing(true); loadShifts(); };

  const filteredShifts = shifts.filter((s) => {
    const status = s.status?.toLowerCase() ?? '';
    if (currentRole === 'worker') {
      if (selectedTab === 'Upcoming') return status === 'open' || status === 'pending' || status === 'confirmed';
      return status === 'completed';
    }
    return status === selectedTab.toLowerCase();
  });

  const tabs = currentRole === 'worker' ? WORKER_TABS : MANAGER_TABS;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <MaterialIcons name="calendar-today" size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
          {currentRole === 'worker' ? 'My Shifts' : 'Shifts'}
        </Text>
      </View>

      {/* Worker reliability score */}
      {currentRole === 'worker' && workerProfile && (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ReliabilityScore score={workerProfile.reliabilityScore ?? 0} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 }}>Reliability Score</Text>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {workerProfile.reliabilityScore ?? 0}/100
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 4 }}>
              {(workerProfile.completedShifts ?? 0)} shifts completed
            </Text>
          </View>
        </View>
      )}

      <SegmentedControl options={tabs} selected={selectedTab} onSelect={setSelectedTab} />

      {loading ? (
        <>
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </>
      ) : filteredShifts.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <MaterialIcons name="calendar-today" size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>
            No {selectedTab.toLowerCase()} shifts
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk-Regular' }}>
            {currentRole === 'manager' ? 'Post a shift to get started.' : 'Accept shifts to see them here.'}
          </Text>
        </View>
      ) : (
        filteredShifts.map((shift, i) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            index={i}
            onPress={() => { console.log('[ShiftsTab] Shift pressed:', shift.id); router.push(`/shift/${shift.id}`); }}
          />
        ))
      )}
    </ScrollView>
  );
}
