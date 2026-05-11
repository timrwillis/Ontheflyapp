import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RoleBadge } from '@/components/RoleBadge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export interface Shift {
  id: string;
  role: string;
  roleNeeded?: string;
  businessId?: string;
  workersNeeded?: number;
  startTime?: string;
  endTime?: string;
  hourlyPay?: number | string;
  business_name?: string;
  business_type?: string;
  business?: { name?: string; type?: string; city?: string; address?: string };
  date?: string;
  start_time?: string;
  end_time?: string;
  hourly_pay?: number | string;
  location?: string;
  urgency?: string;
  dress_code?: string;
  dressCode?: string;
  workers_needed?: number;
  workers_confirmed?: number;
  status?: string;
  notes?: string;
  experience_required?: string;
  experienceRequired?: string;
  certifications_required?: string[];
  certificationsRequired?: string[];
  manager_id?: string;
  business_id?: string;
}

interface ShiftCardProps {
  shift: Shift;
  onPress?: () => void;
  showAcceptButton?: boolean;
  onAccept?: () => void;
  acceptLoading?: boolean;
  index?: number;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatPay(pay?: number | string): string {
  const num = Number(pay);
  if (isNaN(num) || num === 0) return '$--';
  return `$${num.toFixed(0)}/hr`;
}

export function ShiftCard({ shift, onPress, showAcceptButton, onAccept, acceptLoading, index = 0 }: ShiftCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!shift?.id) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [index, opacity, translateY, shift?.id]);

  if (!shift?.id) return null;

  const dateDisplay = formatDate(shift.date);
  const payDisplay = formatPay(shift.hourly_pay ?? shift.hourlyPay);
  const timeDisplay = shift.start_time && shift.end_time
    ? `${shift.start_time} – ${shift.end_time}`
    : shift.start_time ?? '';

  const urgencyBorderColor =
    shift.urgency === 'tonight' ? 'rgba(255, 68, 68, 0.45)' :
    shift.urgency === 'tomorrow' ? 'rgba(255, 184, 0, 0.35)' :
    shift.urgency === 'this_week' ? 'rgba(96, 165, 250, 0.30)' :
    'rgba(255, 255, 255, 0.08)';

  const isEmergency = shift.urgency === 'tonight';
  const businessName = (shift.business_name ?? shift.business?.name) || 'Unknown Venue';
  const roleLabel = shift.role ?? shift.roleNeeded ?? 'Staff';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress}>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: urgencyBorderColor,
            padding: 18,
            marginBottom: 14,
            ...(Platform.OS === 'web'
              ? {
                  boxShadow: isEmergency
                    ? '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,68,68,0.25)'
                    : '0 4px 16px rgba(0,0,0,0.5)',
                }
              : {
                  shadowColor: isEmergency ? '#FF4444' : '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isEmergency ? 0.3 : 0.5,
                  shadowRadius: 12,
                  elevation: 8,
                }),
          }}
        >
          {/* Top row: role badge + urgency */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <RoleBadge role={roleLabel} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {shift.urgency && <UrgencyBadge urgency={shift.urgency} />}
              {isEmergency && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger }} />
              )}
            </View>
          </View>

          {/* Business name */}
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk-Bold',
              marginBottom: 8,
            }}
            numberOfLines={1}
          >
            {businessName}
          </Text>

          {/* Date + time */}
          {(dateDisplay || timeDisplay) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, opacity: 0.85 }}>
              <MaterialIcons name="access-time" size={14} color={COLORS.textSecondary} />
              {dateDisplay !== '' && (
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {dateDisplay}
                </Text>
              )}
              {timeDisplay !== '' && (
                <Text style={{ color: COLORS.textTertiary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {timeDisplay}
                </Text>
              )}
            </View>
          )}

          {/* Location */}
          {shift.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, opacity: 0.85 }}>
              <MaterialIcons name="place" size={14} color={COLORS.textSecondary} />
              <Text
                style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}
                numberOfLines={1}
              >
                {shift.location}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: COLORS.divider, marginBottom: 14 }} />

          {/* Bottom row: pay + workers + accept button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text
                style={{
                  color: COLORS.accent,
                  fontSize: 28,
                  fontWeight: '700',
                  fontFamily: 'SpaceGrotesk-Bold',
                  letterSpacing: -1,
                  lineHeight: 32,
                }}
              >
                {payDisplay}
              </Text>
              {shift.workers_needed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <MaterialIcons name="people" size={12} color={COLORS.textTertiary} />
                  <Text style={{ color: COLORS.textTertiary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                    {shift.workers_confirmed ?? 0}
                  </Text>
                  <Text style={{ color: COLORS.textTertiary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                    /
                  </Text>
                  <Text style={{ color: COLORS.textTertiary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                    {shift.workers_needed} filled
                  </Text>
                </View>
              )}
            </View>

            {showAcceptButton && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[ShiftCard] Accept shift pressed:', shift.id);
                  onAccept?.();
                }}
                disabled={acceptLoading}
              >
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    minWidth: 110,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: acceptLoading ? 0.6 : 1,
                    ...(Platform.OS === 'web'
                      ? { boxShadow: '0 0 16px rgba(0, 255, 135, 0.35)' }
                      : { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 }),
                  }}
                >
                  <Text
                    style={{
                      color: '#000',
                      fontSize: 13,
                      fontWeight: '700',
                      fontFamily: 'SpaceGrotesk-Bold',
                    }}
                  >
                    {acceptLoading ? 'Applying...' : 'Accept Shift'}
                  </Text>
                </View>
              </AnimatedPressable>
            )}

            {!showAcceptButton && shift.status && (
              <StatusBadge status={shift.status} />
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; border: string }> = {
    open:      { bg: COLORS.primaryMuted,              text: COLORS.primary,  border: 'rgba(0, 255, 135, 0.3)' },
    pending:   { bg: COLORS.accentMuted,               text: COLORS.accent,   border: 'rgba(255, 184, 0, 0.3)' },
    filled:    { bg: 'rgba(59, 130, 246, 0.15)',       text: '#60A5FA',       border: 'rgba(96, 165, 250, 0.3)' },
    completed: { bg: 'rgba(107, 114, 128, 0.15)',      text: '#9CA3AF',       border: 'rgba(156, 163, 175, 0.3)' },
    cancelled: { bg: COLORS.dangerMuted,               text: COLORS.danger,   border: 'rgba(255, 68, 68, 0.3)' },
  };
  const cfg = configs[status?.toLowerCase()] ?? configs['open'];
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Open';

  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: cfg.border }}>
      <Text style={{ color: cfg.text, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}
