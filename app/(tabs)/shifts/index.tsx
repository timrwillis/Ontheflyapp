import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
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
          <AnimatedPressable key={opt} onPress={() => onSelect(opt)} style={{ flex: 1 }}>
            <View style={{
              backgroundColor: isActive ? 'rgba(0,255,133,0.08)' : 'transparent',
              borderRadius: 9,
              paddingVertical: 8,
              alignItems: 'center',
              borderWidth: isActive ? 1 : 0,
              borderColor: isActive ? COLORS.border : 'transparent',
              borderBottomWidth: isActive ? 2 : 0,
              borderBottomColor: isActive ? COLORS.primary : 'transparent',
            }}>
              <Text style={{
                color: isActive ? COLORS.text : COLORS.textSecondary,
                fontSize: 13,
                fontWeight: isActive ? '600' : '400',
                fontFamily: isActive ? 'SpaceGrotesk-SemiBold' : 'SpaceGrotesk-Regular',
              }}>
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
      if (currentRole === 'worker') {
        const [appsData, assignData] = await Promise.all([
          apiGet<{ applications?: { shift?: Shift; status?: string }[]; data?: { shift?: Shift; status?: string }[] } | { shift?: Shift; status?: string }[]>('/api/applications/my').catch(() => []),
          apiGet<{ assignments?: { shift?: Shift; status?: string }[] } | { shift?: Shift; status?: string }[]>('/api/assignments/my').catch(() => []),
        ]);
        const appList = Array.isArray(appsData) ? appsData : (appsData as any)?.applications ?? (appsData as any)?.data ?? [];
        const assignList = Array.isArray(assignData) ? assignData : (assignData as any)?.assignments ?? [];
        const mapped: Shift[] = [
          ...appList.map((item: any) => ({ ...(item.shift ?? item), status: item.status ?? item.shift?.status, _type: 'application' } as Shift)),
          ...assignList.map((item: any) => ({ ...(item.shift ?? item), status: item.status ?? item.shift?.status, _type: 'assignment', _assignment_id: item.id } as Shift)),
        ];
        setShifts(mapped);
      } else {
        const data = await apiGet<{ shifts?: Shift[] } | Shift[]>('/api/shifts/my');
        const shiftList = Array.isArray(data) ? data : (data as any)?.shifts ?? [];
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

  const score = workerProfile?.reliabilityScore ?? 0;
  const completedShifts = workerProfile?.completedShifts ?? 0;
  const scoreStanding = score >= 95 ? 'Top 5% of workers' : score >= 85 ? 'Good standing' : 'Building reputation';
  const scoreColor = score >= 95 ? COLORS.primary : score >= 85 ? COLORS.accent : COLORS.danger;
  const scoreBarWidth = Math.min(100, Math.max(0, score));

  const titleText = currentRole === 'worker' ? 'My Shifts' : 'Shift Manager';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, flex: 1 }}>
          {titleText}
        </Text>
        {shifts.length > 0 && (
          <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {shifts.length}
            </Text>
          </View>
        )}
      </View>

      {/* Worker reliability score */}
      {currentRole === 'worker' && workerProfile && (
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}>
          <ReliabilityScore score={score} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 }}>
              Reliability Score
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
              <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                {score}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>
                /100
              </Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 3, backgroundColor: COLORS.surfaceSecondary, borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
              <View style={{ height: 3, width: `${scoreBarWidth}%`, backgroundColor: scoreColor, borderRadius: 2 }} />
            </View>
            <Text style={{ color: scoreColor, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {scoreStanding}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
              {completedShifts} shifts completed
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
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          padding: 40,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <MaterialIcons name="calendar-today" size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>
            No {selectedTab.toLowerCase()} shifts
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk-Regular', marginBottom: 20 }}>
            {currentRole === 'manager' ? 'Post a shift to get started.' : 'Accept shifts to see them here.'}
          </Text>
          {currentRole === 'manager' ? (
            <AnimatedPressable onPress={() => router.push('/create-shift')}>
              <View style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}>
                <Text style={{ color: '#000', fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  Post Your First Shift
                </Text>
              </View>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable onPress={() => router.push('/(tabs)/(home)')}>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                  Browse Open Shifts
                </Text>
              </View>
            </AnimatedPressable>
          )}
        </View>
      ) : (
        filteredShifts.map((shift, i) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            index={i}
            onPress={() => router.push(`/shift/${shift.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}
