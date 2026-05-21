import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Modal, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiGet, apiPatch } from '@/utils/api';
import { ShiftCard, Shift } from '@/components/ShiftCard';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { ShiftCardSkeleton, WorkerCardSkeleton } from '@/components/SkeletonLoader';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { WorkerCard, WorkerProfile } from '@/components/WorkerCard';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DEMO_MODE, DEMO_SHIFTS } from '@/constants/DemoData';

const MANAGER_TABS = ['Open', 'Pending', 'Filled', 'Completed'];
const WORKER_TABS = ['Upcoming', 'Completed'];

interface Application {
  id: string;
  shift_id: string;
  worker_id: string;
  status: string;
  applied_at: string;
  worker: {
    id: string;
    name: string;
    city?: string;
    reliability_score?: number;
    is_available?: boolean;
    is_verified?: boolean;
    worker_roles?: { role: string; years_experience?: number; is_primary?: boolean }[];
  };
}

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

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadShifts = useCallback(async () => {
    if (DEMO_MODE) {
      if (currentRole === 'worker') {
        setShifts(DEMO_SHIFTS.filter((s) => s.status === 'open' || s.status === 'pending').slice(0, 5));
      } else {
        setShifts(DEMO_SHIFTS);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }
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
    } catch {
      // silently fail — UI shows empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentRole]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const onRefresh = () => { setRefreshing(true); loadShifts(); };

  const fetchApplications = async (shiftId: string) => {
    setAppsLoading(true);
    setApplications([]);
    try {
      const data = await apiGet<{ applications: Application[] }>(`/api/shifts/${shiftId}/applications`);
      const list = Array.isArray(data) ? data : (data as any)?.applications ?? [];
      setApplications(list);
    } catch {
      Alert.alert('Error', 'Could not load applicants. Please try again.');
    } finally {
      setAppsLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      await apiPatch(`/api/applications/${applicationId}/confirm`, {});
      setApplications((prev) => prev.map((a) => a.id === applicationId ? { ...a, status: 'confirmed' } : a));
    } catch {
      Alert.alert('Error', 'Could not approve applicant. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      await apiPatch(`/api/applications/${applicationId}/reject`, {});
      setApplications((prev) => prev.map((a) => a.id === applicationId ? { ...a, status: 'rejected' } : a));
    } catch {
      Alert.alert('Error', 'Could not reject applicant. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const openSheetForShift = (shift: Shift) => {
    setSelectedShift(shift);
    fetchApplications(shift.id);
  };

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

  const sheetRoleText = (selectedShift as any)?.role_needed ?? selectedShift?.roleNeeded ?? '';
  const sheetApplicantCount = applications.length;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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

        {/* Reliability score bar — workers only */}
        {currentRole === 'worker' && (
          <View style={{ marginBottom: 20 }}>
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
    </>
  );
}
