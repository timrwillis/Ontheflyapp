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

function formatPayNumber(pay?: number | string): string {
  const num = Number(pay);
  if (isNaN(num) || num === 0) return '$--';
  return `$${num.toFixed(0)}/hr`;
}

const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
}) as object;

const emergencyGlow = Platform.select({
  web: { boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)' },
  default: { shadowColor: '#FF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
}) as object;

export function ShiftCard({ shift, onPress, showAcceptButton, onAccept, acceptLoading, index = 0 }: ShiftCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const emergencyDotOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!shift?.id) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [index, opacity, translateY, shift?.id]);

  useEffect(() => {
    const isEmergencyUrgency = shift?.urgency === 'emergency' || shift?.urgency === 'tonight';
    if (!isEmergencyUrgency) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyDotOpacity, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        Animated.timing(emergencyDotOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [emergencyDotOpacity, shift?.urgency]);

  if (!shift?.id) return null;

  const isEmergency = shift.urgency === 'emergency' || shift.urgency === 'tonight';
  const dateDisplay = formatDate(shift.date);
  const payDisplay = formatPayNumber(shift.hourly_pay ?? shift.hourlyPay);
  const timeDisplay = shift.start_time && shift.end_time
    ? `${shift.start_time} – ${shift.end_time}`
    : shift.start_time ?? '';
  const businessName = (shift.business_name ?? shift.business?.name) || 'Unknown Venue';
  const roleLabel = shift.role ?? shift.roleNeeded ?? 'Staff';
  const dressCode = shift.dress_code ?? shift.dressCode ?? '';
  const expRequired = shift.experience_required ?? shift.experienceRequired ?? '';
  const hasDressOrExp = dressCode || expRequired;
  const dressExpText = [dressCode, expRequired].filter(Boolean).join(' · ');

  const urgencyBorderColor =
    shift.urgency === 'emergency' ? 'rgba(255, 68, 68, 0.5)' :
    shift.urgency === 'tonight' ? 'rgba(255, 68, 68, 0.5)' :
    shift.urgency === 'high' ? 'rgba(255, 184, 0, 0.4)' :
    shift.urgency === 'tomorrow' ? 'rgba(255, 184, 0, 0.4)' :
    shift.urgency === 'medium' ? 'rgba(96, 165, 250, 0.35)' :
    shift.urgency === 'this_week' ? 'rgba(96, 165, 250, 0.35)' :
    'rgba(255, 255, 255, 0.08)';

  const cardShadow = isEmergency ? emergencyGlow : (Platform.OS === 'web'
    ? { boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 });

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
            ...cardShadow,
          }}
        >
          {/* Top row: role badge + urgency + pulsing dot */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <RoleBadge role={roleLabel} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {shift.urgency && <UrgencyBadge urgency={shift.urgency} />}
              {isEmergency && (
                <Animated.View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: COLORS.danger,
                  opacity: emergencyDotOpacity,
                }} />
              )}
            </View>
          </View>

          {/* Pay + Business name row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
            <Text style={{
              color: COLORS.accent,
              fontSize: 34,
              fontWeight: '800',
              fontFamily: 'SpaceGrotesk-Bold',
              letterSpacing: -1,
              lineHeight: 40,
            }}>
              {payDisplay}
            </Text>
            <Text
              style={{
                color: COLORS.text,
                fontSize: 16,
                fontWeight: '700',
                fontFamily: 'SpaceGrotesk-Bold',
                textAlign: 'right',
                maxWidth: 160,
              }}
              numberOfLines={2}
            >
              {businessName}
            </Text>
          </View>

          {/* Details rows */}
          <View style={{ marginTop: 10, gap: 6 }}>
            {(dateDisplay || timeDisplay) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
            {shift.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="place" size={14} color={COLORS.textSecondary} />
                <Text
                  style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', flex: 1 }}
                  numberOfLines={1}
                >
                  {shift.location}
                </Text>
              </View>
            )}
            {hasDressOrExp && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="work" size={14} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', flex: 1 }} numberOfLines={1}>
                  {dressExpText}
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 14 }} />

          {/* Bottom row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {shift.workers_needed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12 }}>👥</Text>
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
            ) : (
              <View />
            )}

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
                    minWidth: 120,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: acceptLoading ? 0.6 : 1,
                    ...primaryGlow,
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
                    {acceptLoading ? 'Applying...' : 'Accept Shift →'}
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
