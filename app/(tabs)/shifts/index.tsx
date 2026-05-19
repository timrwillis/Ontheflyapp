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
          <AnimatedPressable key={opt} onPress={() => { console.log('[ShiftsTab] Segment selected:', opt); onSelect(opt); }} style={{ flex: 1 }}>
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
      console.log('[ShiftsTab] DEMO_MODE: using demo data');
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
        console.log('[ShiftsTab] Loading worker applications from /api/applications/my');
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
        console.log('[ShiftsTab] Loaded', mapped.length, 'worker shifts');
      } else {
        console.log('[ShiftsTab] Loading manager shifts from /api/shifts/my');
        const data = await apiGet<{ shifts?: Shift[] } | Shift[]>('/api/shifts/my');
        const shiftList = Array.isArray(data) ? data : (data as any)?.shifts ?? [];
        setShifts(shiftList);
        console.log('[ShiftsTab] Loaded', shiftList.length, 'manager shifts');
      }
    } catch (err) {
      console.error('[ShiftsTab] Error loading shifts:', err);
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
      console.log('[ShiftsTab] Loaded', list.length, 'applications for shift', shiftId);
    } catch (err) {
      console.error('[ShiftsTab] Error loading applications:', err);
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
      console.log('[ShiftsTab] Application confirmed:', applicationId);
    } catch (err) {
      console.error('[ShiftsTab] Error confirming application:', err);
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
      console.log('[ShiftsTab] Application rejected:', applicationId);
    } catch (err) {
      console.error('[ShiftsTab] Error rejecting application:', err);
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
              <AnimatedPressable onPress={() => { console.log('[ShiftsTab] Post First Shift CTA pressed'); router.push('/create-shift'); }}>
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
              <AnimatedPressable onPress={() => { console.log('[ShiftsTab] Browse Open Shifts CTA pressed'); router.push('/(tabs)/(home)'); }}>
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
              onPress={() => {
                if (currentRole === 'manager' && selectedTab === 'Pending') {
                  console.log('[ShiftsTab] Pending shift tapped, opening applicants sheet:', shift.id);
                  openSheetForShift(shift);
                } else {
                  console.log('[ShiftsTab] Shift pressed:', shift.id);
                  router.push(`/shift/${shift.id}`);
                }
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedShift}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedShift(null)}
      >
        <View style={{ flex: 1 }} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={() => setSelectedShift(null)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </TouchableWithoutFeedback>
          <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '80%',
          borderTopWidth: 1,
          borderColor: COLORS.border,
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 17, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700' }}>
                Applicants
              </Text>
              {!!selectedShift && (
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>
                  {`${sheetRoleText} · ${sheetApplicantCount} applied`}
                </Text>
              )}
            </View>
            <AnimatedPressable onPress={() => setSelectedShift(null)}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="close" size={18} color={COLORS.textSecondary} />
              </View>
            </AnimatedPressable>
          </View>
          {/* Content */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {appsLoading ? (
              <>
                <WorkerCardSkeleton />
                <WorkerCardSkeleton />
                <WorkerCardSkeleton />
              </>
            ) : applications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialIcons name="people-outline" size={40} color={COLORS.textTertiary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginTop: 12, textAlign: 'center' }}>
                  No applicants yet
                </Text>
              </View>
            ) : (
              applications.map((app, i) => {
                const workerForCard: WorkerProfile = {
                  id: app.worker.id,
                  userId: app.worker_id,
                  name: app.worker.name,
                  city: app.worker.city,
                  reliabilityScore: app.worker.reliability_score ?? 0,
                  reliability_score: app.worker.reliability_score ?? 0,
                  isAvailable: app.worker.is_available ?? false,
                  is_available: app.worker.is_available ?? false,
                  isVerified: app.worker.is_verified ?? false,
                  is_verified: app.worker.is_verified ?? false,
                  roles: (app.worker.worker_roles ?? []).map((r) => r.role),
                  worker_roles: app.worker.worker_roles ?? [],
                };
                const isPending = app.status === 'pending';
                const isConfirmed = app.status === 'confirmed';
                const isRejected = app.status === 'rejected';
                const isActioning = actionLoading === app.id;
                return (
                  <View key={app.id} style={{ marginBottom: 4 }}>
                    <WorkerCard worker={workerForCard} index={i} />
                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: -4, marginBottom: 16, paddingHorizontal: 4 }}>
                      {isConfirmed ? (
                        <View style={{ flex: 1, backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,255,135,0.3)' }}>
                          <Text style={{ color: COLORS.primary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                            {'✓ Approved'}
                          </Text>
                        </View>
                      ) : isRejected ? (
                        <View style={{ flex: 1, backgroundColor: COLORS.dangerMuted, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                          <Text style={{ color: COLORS.danger, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                            {'✕ Rejected'}
                          </Text>
                        </View>
                      ) : (
                        <>
                          <AnimatedPressable onPress={() => { console.log('[ShiftsTab] Approve pressed:', app.id); handleApprove(app.id); }} style={{ flex: 1 }} disabled={isActioning}>
                            <View style={{ backgroundColor: isActioning ? 'rgba(0,255,135,0.4)' : COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                              {isActioning ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="check" size={16} color="#000" />}
                              <Text style={{ color: '#000', fontSize: 13, fontFamily: 'SpaceGrotesk-Bold' }}>
                                Approve
                              </Text>
                            </View>
                          </AnimatedPressable>
                          <AnimatedPressable onPress={() => { console.log('[ShiftsTab] Reject pressed:', app.id); handleReject(app.id); }} style={{ flex: 1 }} disabled={isActioning}>
                            <View style={{ backgroundColor: COLORS.dangerMuted, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' }}>
                              {isActioning ? <ActivityIndicator size="small" color={COLORS.danger} /> : <MaterialIcons name="close" size={16} color={COLORS.danger} />}
                              <Text style={{ color: COLORS.danger, fontSize: 13, fontFamily: 'SpaceGrotesk-Bold' }}>
                                Reject
                              </Text>
                            </View>
                          </AnimatedPressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
