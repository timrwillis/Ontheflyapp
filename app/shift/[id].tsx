import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
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
import { MapPin, Clock, DollarSign, Users, Star, CheckCircle, XCircle, Calendar } from 'lucide-react-native';

interface Application {
  id: string;
  user_id?: string;
  worker_name?: string;
  worker_id?: string;
  status?: string;
  reliability_score?: number;
  roles?: string[];
}

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

  const dateDisplay = formatDate(shift?.date);
  const payDisplay = formatPay(shift?.hourly_pay);
  const timeDisplay = shift?.start_time && shift?.end_time ? `${shift.start_time} – ${shift.end_time}` : shift?.start_time ?? '—';
  const isOpen = shift?.status === 'open' || shift?.status === 'pending';

  return (
    <>
      <Stack.Screen options={{ title: shift?.role ?? 'Shift Detail' }} />
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
            {/* Hero */}
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <RoleBadge role={shift.role ?? 'Staff'} size="md" />
                {shift.urgency && <UrgencyBadge urgency={shift.urgency} />}
              </View>
              <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>
                {shift.business_name ?? 'Unknown Venue'}
              </Text>
              {shift.business_type && (
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{shift.business_type}</Text>
              )}
            </View>

            {/* Info grid */}
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 12 }}>SHIFT DETAILS</Text>
              {[
                { icon: <Calendar size={16} color={COLORS.textSecondary} />, label: 'Date', value: dateDisplay },
                { icon: <Clock size={16} color={COLORS.textSecondary} />, label: 'Time', value: timeDisplay },
                { icon: <DollarSign size={16} color={COLORS.primary} />, label: 'Pay', value: payDisplay, highlight: true },
                { icon: <MapPin size={16} color={COLORS.textSecondary} />, label: 'Location', value: shift.location ?? '—' },
                { icon: <Users size={16} color={COLORS.textSecondary} />, label: 'Workers Needed', value: `${shift.workers_confirmed ?? 0}/${shift.workers_needed ?? 1} filled` },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 10 }}>
                  {item.icon}
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>{item.label}</Text>
                  <Text style={{ color: item.highlight ? COLORS.primary : COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }} numberOfLines={1}>
                    {item.value}
                  </Text>
                </View>
              ))}
              {shift.dress_code && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 10 }}>
                  <Star size={16} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>Dress Code</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{shift.dress_code}</Text>
                </View>
              )}
              {shift.experience_required && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
                  <Star size={16} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', width: 110 }}>Experience</Text>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{shift.experience_required}</Text>
                </View>
              )}
            </View>

            {/* Certifications */}
            {shift.certifications_required && shift.certifications_required.length > 0 && (
              <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 10 }}>CERTIFICATIONS REQUIRED</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {shift.certifications_required.map((cert) => (
                    <View key={cert} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{cert}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Notes */}
            {shift.notes && (
              <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 8 }}>NOTES</Text>
                <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>{shift.notes}</Text>
              </View>
            )}

            {/* Worker: Accept button */}
            {currentRole === 'worker' && isOpen && (
              <AnimatedPressable onPress={() => { console.log('[ShiftDetail] Accept shift pressed:', id); handleApply(); }} disabled={applying}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 16, opacity: applying ? 0.6 : 1, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0, 255, 135, 0.3)' } : { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 }) }}>
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                    {applying ? 'Applying...' : 'Accept Shift'}
                  </Text>
                </View>
              </AnimatedPressable>
            )}

            {/* Manager: Applications */}
            {currentRole === 'manager' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 12 }}>
                  Applications ({applications.length})
                </Text>
                {applications.length === 0 ? (
                  <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>No applications yet</Text>
                  </View>
                ) : (
                  applications.map((app) => (
                    <View key={app.id} style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                            {(app.worker_name ?? 'W').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                            {app.worker_name ?? 'Worker'}
                          </Text>
                          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                            Status: {app.status ?? 'pending'}
                          </Text>
                        </View>
                        {app.reliability_score !== undefined && (
                          <ReliabilityScore score={app.reliability_score} size={44} showLabel={false} />
                        )}
                      </View>
                      {app.status !== 'confirmed' && app.status !== 'rejected' && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <AnimatedPressable
                            onPress={() => { console.log('[ShiftDetail] Confirm application:', app.id); handleConfirm(app.id); }}
                            disabled={actionLoading === app.id}
                            style={{ flex: 1 }}
                          >
                            <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                              <CheckCircle size={16} color={COLORS.primary} />
                              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>Confirm</Text>
                            </View>
                          </AnimatedPressable>
                          <AnimatedPressable
                            onPress={() => { console.log('[ShiftDetail] Reject application:', app.id); handleReject(app.id); }}
                            disabled={actionLoading === app.id}
                            style={{ flex: 1 }}
                          >
                            <View style={{ backgroundColor: COLORS.dangerMuted, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                              <XCircle size={16} color={COLORS.danger} />
                              <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>Reject</Text>
                            </View>
                          </AnimatedPressable>
                        </View>
                      )}
                      {(app.status === 'confirmed' || app.status === 'rejected') && (
                        <View style={{ backgroundColor: app.status === 'confirmed' ? COLORS.primaryMuted : COLORS.dangerMuted, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                          <Text style={{ color: app.status === 'confirmed' ? COLORS.primary : COLORS.danger, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                            {app.status === 'confirmed' ? 'Confirmed' : 'Rejected'}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}
