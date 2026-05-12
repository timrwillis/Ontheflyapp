import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Alert, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiGet, apiPost, apiPatch } from '@/utils/api';
import { Shift } from '@/components/ShiftCard';
import { RoleBadge } from '@/components/RoleBadge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ShiftCardSkeleton } from '@/components/SkeletonLoader';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Application {
  id: string;
  user_id?: string;
  worker_name?: string;
  worker_id?: string;
  status?: string;
  reliability_score?: number;
  roles?: string[];
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

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatPay(pay?: number | string): string {
  const num = Number(pay);
  if (isNaN(num)) return '$—/hr';
  return `$${num.toFixed(0)}/hr`;
}

function getWorkerInitials(name?: string): string {
  if (!name) return 'W';
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function LiveSignalBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: color + '44' }}>
      <Text style={{ color, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold' }}>{label}</Text>
    </View>
  );
}

function FillProgressBar({ confirmed, needed }: { confirmed: number; needed: number }) {
  const safeNeeded = Math.max(1, needed);
  const progress = Math.min(1, confirmed / safeNeeded);
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressPercent = Math.round(progress * 100);
  const progressDisplay = String(progressPercent) + '%';
  const confirmedDisplay = String(confirmed);
  const neededDisplay = String(safeNeeded);

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress, progressWidth]);

  const barColor = progress >= 1 ? COLORS.primary : progress >= 0.5 ? COLORS.accent : COLORS.danger;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.5 }}>WORKERS FILLING</Text>
        <Text style={{ color: COLORS.text, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>
          {confirmedDisplay}
          {'/'}
          {neededDisplay}
          {' · '}
          {progressDisplay}
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <Animated.View style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: barColor,
          width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }} />
      </View>
    </View>
  );
}

function PulseButton({ onPress, disabled, label }: { onPress: () => void; disabled: boolean; label: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.02, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [disabled, scale]);

  return (
    <AnimatedPressable onPress={onPress} disabled={disabled}>
      <Animated.View style={{
        transform: [{ scale }],
        backgroundColor: disabled ? 'rgba(0,255,135,0.4)' : COLORS.primary,
        borderRadius: 16,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
        ...primaryGlow,
      }}>
        <MaterialIcons name="check-circle" size={22} color="#000" />
        <Text style={{ color: '#000', fontSize: 17, fontFamily: 'SpaceGrotesk-Bold' }}>{label}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentRole, currentUser } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shift, setShift] = useState<Shift | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      console.log('[ShiftDetail] Loading shift:', id);
      const [shiftData, appsData] = await Promise.all([
        apiGet<Shift>(`/api/shifts/${id}`),
        currentRole === 'manager' ? apiGet<Application[]>(`/api/shifts/${id}/applications`) : Promise.resolve([]),
      ]);
      setShift(shiftData);
      setApplications(Array.isArray(appsData) ? appsData : []);
    } catch (err) {
      console.error('[ShiftDetail] Error loading shift:', err);
    } finally {
      setLoading(false);
    }
  }, [id, currentRole]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApply = async () => {
    if (!currentUser?.id || !id) return;
    setApplying(true);
    try {
      console.log('[ShiftDetail] Applying to shift:', id, 'user:', currentUser.id);
      await apiPost(`/api/shifts/${id}/apply`, { user_id: currentUser.id });
      Alert.alert('Applied!', 'Your application has been submitted. The manager will confirm shortly.');
      loadData();
    } catch (err) {
      console.error('[ShiftDetail] Error applying:', err);
      Alert.alert('Error', 'Could not apply to this shift. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleConfirm = async (appId: string) => {
    setActionLoading(appId);
    try {
      console.log('[ShiftDetail] Confirming application:', appId);
      await apiPatch(`/api/applications/${appId}/confirm`, {});
      loadData();
    } catch (err) {
      console.error('[ShiftDetail] Error confirming:', err);
      Alert.alert('Error', 'Could not confirm this application.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (appId: string) => {
    setActionLoading(appId);
    try {
      console.log('[ShiftDetail] Rejecting application:', appId);
      await apiPatch(`/api/applications/${appId}/reject`, {});
      loadData();
    } catch (err) {
      console.error('[ShiftDetail] Error rejecting:', err);
      Alert.alert('Error', 'Could not reject this application.');
    } finally {
      setActionLoading(null);
    }
  };

  // Derived display values
  const dateDisplay = formatDate(shift?.date);
  const payDisplay = formatPay(shift?.hourly_pay ?? shift?.hourlyPay);
  const shiftStartTime = shift?.start_time ?? shift?.startTime;
  const shiftEndTime = shift?.end_time ?? shift?.endTime;
  const timeDisplay = shiftStartTime && shiftEndTime ? `${shiftStartTime} – ${shiftEndTime}` : shiftStartTime ?? '—';
  const isOpen = shift?.status === 'open' || shift?.status === 'pending';
  const isEmergency = shift?.urgency === 'emergency' || shift?.urgency === 'urgent';
  const workersConfirmed = shift?.workers_confirmed ?? 0;
  const workersNeeded = shift?.workers_needed ?? shift?.workersNeeded ?? 1;
  const hourlyPay = Number(shift?.hourly_pay ?? shift?.hourlyPay) || 0;
  const isBoostedPay = hourlyPay >= 30;
  const businessName = (shift?.business_name ?? shift?.business?.name) || 'Unknown Venue';
  const businessType = shift?.business_type ?? shift?.business?.type;
  const shiftRole = shift?.role ?? shift?.roleNeeded ?? 'Staff';
  const applyButtonLabel = applying ? 'Applying...' : 'Accept Shift';

  // Live signal badges
  const liveSignals: { label: string; color: string; bg: string }[] = [];
  if (isEmergency) liveSignals.push({ label: 'Rush Coverage 🚨', color: COLORS.danger, bg: COLORS.dangerMuted });
  if (isBoostedPay) liveSignals.push({ label: 'Boosted Pay ⚡', color: COLORS.accent, bg: COLORS.accentMuted });
  if (shift?.urgency === 'vip') liveSignals.push({ label: 'VIP Event 👑', color: '#C084FC', bg: 'rgba(192,132,252,0.12)' });

  return (
    <>
      <Stack.Screen options={{
        title: shiftRole,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        headerLeft: () => (
          <AnimatedPressable onPress={() => { console.log('[ShiftDetail] Back button pressed'); router.back(); }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <MaterialIcons name="chevron-left" size={24} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        ),
      }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <>
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
          </>
        ) : !shift ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk-Regular' }}>Shift not found</Text>
          </View>
        ) : (
          <>
            {/* Live signal badges */}
            {liveSignals.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {liveSignals.map((sig) => (
                  <LiveSignalBadge key={sig.label} label={sig.label} color={sig.color} bg={sig.bg} />
                ))}
              </View>
            ) : null}

            {/* Hero card */}
            <View style={{
              ...glass,
              marginBottom: 16,
              borderLeftWidth: isEmergency ? 3 : 1,
              borderLeftColor: isEmergency ? COLORS.danger : 'rgba(255,255,255,0.08)',
              padding: 20,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <RoleBadge role={shiftRole} size="md" />
                {shift.urgency ? <UrgencyBadge urgency={shift.urgency} /> : null}
              </View>

              {/* Pay rate — prominent */}
              <Text style={{ color: COLORS.primary, fontSize: 34, fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>
                {payDisplay}
              </Text>

              {/* Business name */}
              <Text style={{ color: COLORS.text, fontSize: 20, fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>
                {businessName}
              </Text>
              {businessType ? (
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 12 }}>{businessType}</Text>
              ) : null}

              {/* Fill progress */}
              <FillProgressBar confirmed={workersConfirmed} needed={workersNeeded} />
            </View>

            {/* Shift details */}
            <View style={{ ...glass, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>SHIFT DETAILS</Text>
              </View>

              {[
                { icon: 'calendar-today' as const, label: 'Date', value: dateDisplay, highlight: false },
                { icon: 'access-time' as const, label: 'Time', value: timeDisplay, highlight: false },
                { icon: 'place' as const, label: 'Location', value: shift.location ?? '—', highlight: false },
                { icon: 'people' as const, label: 'Workers Needed', value: `${workersConfirmed}/${workersNeeded} filled`, highlight: false },
              ].map((item, idx) => {
                const isLast = idx === 3 && !(shift.dress_code ?? shift.dressCode) && !(shift.experience_required ?? shift.experienceRequired);
                return (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: COLORS.divider, gap: 10 }}>
                    <MaterialIcons name={item.icon} size={16} color={COLORS.textSecondary} />
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>{item.label}</Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }} numberOfLines={1}>{item.value}</Text>
                  </View>
                );
              })}

              {/* Pay row — highlighted */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider, gap: 10, backgroundColor: 'rgba(0,255,135,0.04)', borderRadius: 8, marginTop: 4, paddingHorizontal: 8 }}>
                <MaterialIcons name="attach-money" size={16} color={COLORS.primary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>Pay Rate</Text>
                <Text style={{ color: COLORS.primary, fontSize: 18, fontFamily: 'SpaceGrotesk-Bold', flex: 1 }}>{payDisplay}</Text>
              </View>

              {(shift.dress_code ?? shift.dressCode) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider, gap: 10 }}>
                  <MaterialIcons name="checkroom" size={16} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>Dress Code</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{shift.dress_code ?? shift.dressCode}</Text>
                </View>
              ) : null}

              {(shift.experience_required ?? shift.experienceRequired) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider, gap: 10 }}>
                  <MaterialIcons name="work" size={16} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>Experience</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{shift.experience_required ?? shift.experienceRequired}</Text>
                </View>
              ) : null}
            </View>

            {/* Certifications */}
            {((shift.certifications_required ?? shift.certificationsRequired) ?? []).length > 0 ? (
              <View style={{ ...glass, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.accent }} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>CERTIFICATIONS REQUIRED</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(shift.certifications_required ?? shift.certificationsRequired ?? []).map((cert) => (
                    <View key={cert} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' }}>
                      <Text style={{ color: COLORS.accent, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>{cert}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Notes */}
            {shift.notes ? (
              <View style={{ ...glass, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: COLORS.primary }} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1 }}>NOTES</Text>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>{shift.notes}</Text>
              </View>
            ) : null}

            {/* Worker: Accept button */}
            {currentRole === 'worker' && isOpen ? (
              <PulseButton
                onPress={() => { console.log('[ShiftDetail] Accept shift pressed:', id); handleApply(); }}
                disabled={applying}
                label={applyButtonLabel}
              />
            ) : null}

            {/* Manager: Applications */}
            {currentRole === 'manager' ? (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: COLORS.primary }} />
                  <Text style={{ color: COLORS.text, fontSize: 18, fontFamily: 'SpaceGrotesk-Bold' }}>
                    {'Applications ('}
                    {applications.length}
                    {')'}
                  </Text>
                </View>
                {applications.length === 0 ? (
                  <View style={{ ...glass, paddingVertical: 36, alignItems: 'center' }}>
                    <MaterialIcons name="people-outline" size={32} color={COLORS.textTertiary} style={{ marginBottom: 10 }} />
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>No applications yet</Text>
                  </View>
                ) : (
                  applications.map((app) => {
                    const appInitials = getWorkerInitials(app.worker_name);
                    const isConfirmed = app.status === 'confirmed';
                    const isRejected = app.status === 'rejected';
                    const isPending = !isConfirmed && !isRejected;
                    const statusText = isConfirmed ? 'Confirmed' : 'Rejected';

                    return (
                      <View key={app.id} style={{ ...glass, marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: isPending ? 12 : 0 }}>
                          {/* Initials avatar */}
                          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryMuted, borderWidth: 2, borderColor: 'rgba(0,255,135,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: COLORS.primary, fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>{appInitials}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 2 }}>
                              {app.worker_name ?? 'Worker'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isConfirmed ? COLORS.primary : isRejected ? COLORS.danger : COLORS.accent }} />
                              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                                {app.status ?? 'pending'}
                              </Text>
                            </View>
                          </View>
                          {app.reliability_score !== undefined ? (
                            <ReliabilityScore score={app.reliability_score} size={48} showLabel={false} />
                          ) : null}
                        </View>

                        {isPending ? (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <AnimatedPressable
                              onPress={() => { console.log('[ShiftDetail] Confirm application:', app.id); handleConfirm(app.id); }}
                              disabled={actionLoading === app.id}
                              style={{ flex: 1 }}
                            >
                              <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,255,135,0.2)' }}>
                                <MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
                                <Text style={{ color: COLORS.primary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>Confirm</Text>
                              </View>
                            </AnimatedPressable>
                            <AnimatedPressable
                              onPress={() => { console.log('[ShiftDetail] Reject application:', app.id); handleReject(app.id); }}
                              disabled={actionLoading === app.id}
                              style={{ flex: 1 }}
                            >
                              <View style={{ backgroundColor: COLORS.dangerMuted, borderRadius: 10, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)' }}>
                                <MaterialIcons name="cancel" size={16} color={COLORS.danger} />
                                <Text style={{ color: COLORS.danger, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>Reject</Text>
                              </View>
                            </AnimatedPressable>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: isConfirmed ? COLORS.primaryMuted : COLORS.dangerMuted, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: isConfirmed ? 'rgba(0,255,135,0.2)' : 'rgba(255,68,68,0.2)' }}>
                            <Text style={{ color: isConfirmed ? COLORS.primary : COLORS.danger, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                              {statusText}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}
