import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RoleBadge } from '@/components/RoleBadge';
import { UrgencyBadge } from '@/components/UrgencyBadge';
import { MapPin, Clock, Users } from 'lucide-react-native';

export interface Shift {
  id: string;
  role: string;
  business_name?: string;
  business_type?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  hourly_pay?: number | string;
  location?: string;
  urgency?: string;
  dress_code?: string;
  workers_needed?: number;
  workers_confirmed?: number;
  status?: string;
  notes?: string;
  experience_required?: string;
  certifications_required?: string[];
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
  if (isNaN(num)) return '$--';
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
  const payDisplay = formatPay(shift.hourly_pay);
  const timeDisplay = shift.start_time && shift.end_time
    ? `${shift.start_time} – ${shift.end_time}`
    : shift.start_time ?? '';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderLeftWidth: 3,
            borderLeftColor: COLORS.primary,
            padding: 16,
            marginBottom: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {/* Top row: role badge + urgency */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <RoleBadge role={shift.role ?? 'Staff'} />
            {shift.urgency && <UrgencyBadge urgency={shift.urgency} />}
          </View>

          {/* Business name */}
          <Text
            style={{
              color: COLORS.text,
              fontSize: 17,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk-Bold',
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {shift.business_name ?? 'Unknown Venue'}
          </Text>

          {/* Date + time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Clock size={14} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
              {dateDisplay}
            </Text>
            {timeDisplay !== '' && (
              <Text style={{ color: COLORS.textTertiary, fontSize: 13 }}>
                {timeDisplay}
              </Text>
            )}
          </View>

          {/* Location */}
          {shift.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text
                style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}
                numberOfLines={1}
              >
                {shift.location}
              </Text>
            </View>
          )}

          {/* Bottom row: pay + workers + accept button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text
                style={{
                  color: COLORS.primary,
                  fontSize: 24,
                  fontWeight: '700',
                  fontFamily: 'SpaceGrotesk-Bold',
                  letterSpacing: -0.5,
                }}
              >
                {payDisplay}
              </Text>
              {shift.workers_needed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Users size={12} color={COLORS.textTertiary} />
                  <Text style={{ color: COLORS.textTertiary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular' }}>
                    {shift.workers_confirmed ?? 0}/{shift.workers_needed} filled
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
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    minWidth: 110,
                    alignItems: 'center',
                    opacity: acceptLoading ? 0.6 : 1,
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
  const configs: Record<string, { bg: string; text: string }> = {
    open: { bg: COLORS.primaryMuted, text: COLORS.primary },
    pending: { bg: COLORS.accentMuted, text: COLORS.accent },
    filled: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
    completed: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
    cancelled: { bg: COLORS.dangerMuted, text: COLORS.danger },
  };
  const cfg = configs[status?.toLowerCase()] ?? configs['open'];
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Open';

  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ color: cfg.text, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}
