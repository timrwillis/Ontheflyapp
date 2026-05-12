import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform, ScrollView } from 'react-native';
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

function getViewerCount(id: string): number {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (hash % 6) + 2; // 2–7
}

// Fixed "now" of 6:00 PM so urgency shifts always show a useful countdown
function getMinutesUntilStart(startTime?: string): number | null {
  if (!startTime) return null;
  try {
    const now = new Date();
    now.setHours(18, 0, 0, 0); // fixed 6:00 PM
    const [timePart, meridiem] = startTime.split(' ');
    if (!timePart) return null;
    const [hourStr, minStr] = timePart.split(':');
    let hour = parseInt(hourStr, 10);
    const min = parseInt(minStr ?? '0', 10);
    if (meridiem?.toLowerCase() === 'pm' && hour !== 12) hour += 12;
    if (meridiem?.toLowerCase() === 'am' && hour === 12) hour = 0;
    const target = new Date(now);
    target.setHours(hour, min, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / 60000);
    return diff > 0 ? diff : null;
  } catch {
    return null;
  }
}

interface LiveSignal {
  label: string;
  color: string;
  bgColor: string;
  pulse?: boolean;
}

function buildLiveSignals(shift: Shift): LiveSignal[] {
  const signals: LiveSignal[] = [];
  const urgency = shift.urgency ?? '';
  const isUrgent = urgency === 'emergency' || urgency === 'tonight';
  const pay = Number(shift.hourly_pay ?? shift.hourlyPay ?? 0);
  const workersNeeded = shift.workers_needed ?? shift.workersNeeded ?? 0;
  const businessName = (shift.business_name ?? shift.business?.name ?? '').toLowerCase();
  const notes = (shift.notes ?? '').toLowerCase();

  // Rush Coverage (emergency only — replaces Just Posted)
  if (urgency === 'emergency') {
    signals.push({ label: 'Rush Coverage 🚨', color: COLORS.danger, bgColor: 'rgba(255,68,68,0.15)', pulse: true });
  } else if (urgency === 'tonight') {
    // Just Posted for tonight
    signals.push({ label: 'Just Posted', color: COLORS.primary, bgColor: 'rgba(0,255,135,0.12)' });
  }

  // X workers viewing
  const viewerCount = getViewerCount(shift.id);
  signals.push({ label: `${viewerCount} viewing`, color: '#FF8C00', bgColor: 'rgba(255,140,0,0.12)', pulse: true });

  // High Demand
  if (workersNeeded > 1 || isUrgent) {
    signals.push({ label: 'High Demand', color: COLORS.danger, bgColor: 'rgba(255,68,68,0.12)' });
  }

  // Starts in X min
  if (isUrgent) {
    const mins = getMinutesUntilStart(shift.start_time ?? shift.startTime);
    if (mins !== null) {
      signals.push({ label: `Starts in ${mins}min`, color: COLORS.accent, bgColor: 'rgba(255,184,0,0.12)' });
    }
  }

  // Boosted Pay
  if (pay >= 35) {
    signals.push({ label: 'Boosted Pay ⚡', color: '#FFD700', bgColor: 'rgba(255,215,0,0.12)' });
  }

  // VIP Event
  const vipKeywords = ['vip', 'lounge', 'luna', 'velvet'];
  const isVip = vipKeywords.some((kw) => businessName.includes(kw)) || notes.includes('vip');
  if (isVip) {
    signals.push({ label: 'VIP Event 👑', color: '#C084FC', bgColor: 'rgba(192,132,252,0.12)' });
  }

  // Cap at 3 signals
  return signals.slice(0, 3);
}

function SignalBadge({ label, color, bgColor, pulse }: { label: string; color: string; bgColor: string; pulse?: boolean }) {
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.2, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [pulse, dotOpacity]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bgColor, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
      {pulse && (
        <Animated.View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: dotOpacity }} />
      )}
      <Text style={{ color, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{label}</Text>
    </View>
  );
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
  const fillBarWidth = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const confirmed = shift?.workers_confirmed ?? 0;
    const needed = shift?.workers_needed ?? 0;
    if (needed <= 0) return;
    const ratio = Math.min(confirmed / needed, 1);
    Animated.timing(fillBarWidth, {
      toValue: ratio,
      duration: 800,
      delay: index * 60 + 300,
      useNativeDriver: false,
    }).start();
  }, [fillBarWidth, shift?.workers_confirmed, shift?.workers_needed, index]);

  if (!shift?.id) return null;

  const isEmergency = shift.urgency === 'emergency' || shift.urgency === 'tonight';
  const dateDisplay = formatDate(shift.date);
  const pay = Number(shift.hourly_pay ?? shift.hourlyPay ?? 0);
  const payDisplay = formatPayNumber(shift.hourly_pay ?? shift.hourlyPay);
  const isHighPay = pay >= 35;
  const payColor = isHighPay ? '#FFD700' : COLORS.accent;
  const timeDisplay = shift.start_time && shift.end_time
    ? `${shift.start_time} – ${shift.end_time}`
    : shift.start_time ?? '';
  const businessName = (shift.business_name ?? shift.business?.name) || 'Unknown Venue';
  const roleLabel = shift.role ?? shift.roleNeeded ?? 'Staff';
  const dressCode = shift.dress_code ?? shift.dressCode ?? '';
  const expRequired = shift.experience_required ?? shift.experienceRequired ?? '';
  const hasDressOrExp = dressCode || expRequired;
  const dressExpText = [dressCode, expRequired].filter(Boolean).join(' · ');

  const workersNeeded = shift.workers_needed ?? 0;
  const workersConfirmed = shift.workers_confirmed ?? 0;
  const showFillBar = workersNeeded > 0;
  const fillLabel = `${workersConfirmed}/${workersNeeded} filled`;

  const liveSignals = buildLiveSignals(shift);

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
            borderLeftWidth: isEmergency ? 4 : 1,
            borderLeftColor: isEmergency ? COLORS.danger : urgencyBorderColor,
            padding: 18,
            marginBottom: 14,
            overflow: 'hidden',
            ...cardShadow,
          }}
        >
          {/* Live signal badges row */}
          {liveSignals.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              contentContainerStyle={{ gap: 6 }}
            >
              {liveSignals.map((sig, i) => (
                <SignalBadge key={i} label={sig.label} color={sig.color} bgColor={sig.bgColor} pulse={sig.pulse} />
              ))}
            </ScrollView>
          )}

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
              color: payColor,
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
                  {workersConfirmed}
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
                    paddingVertical: 14,
                    minWidth: 120,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: acceptLoading ? 0.6 : 1,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
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

          {/* Fill bar */}
          {showFillBar && (
            <View style={{ marginTop: 14 }}>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <Animated.View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: COLORS.primary,
                    width: fillBarWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  }}
                />
              </View>
              <Text style={{ color: COLORS.textTertiary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', marginTop: 4 }}>
                {fillLabel}
              </Text>
            </View>
          )}
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
