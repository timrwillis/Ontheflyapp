import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  Animated,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getShiftStart, formatRelativeTime, formatAbsoluteTime } from '@/utils/shiftTime';
import { formatHourlyRate } from '@/utils/money';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RushShift {
  id: string;
  role: string;
  /** Integer cents — primary pay field from backend (e.g. 3550 = $35.50) */
  hourly_pay_cents?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  business_name?: string;
  business?: { name?: string; city?: string; address?: string };
  city?: string;
  address?: string;
  is_rush?: boolean;
  urgency?: string;
  status?: string;
}

interface RushFeedSectionProps {
  isAvailableNow: boolean;
  hasTemplate: boolean;
  onGoToTemplate: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';
}

// ─── Rush Shift Card ──────────────────────────────────────────────────────────

interface RushShiftCardProps {
  shift: RushShift;
  onClaim: (shift: RushShift) => void;
  claimingId: string | null;
}

function RushShiftCard({ shift, onClaim, claimingId }: RushShiftCardProps) {
  const isClaiming = claimingId === shift.id;
  const payDisplay = formatHourlyRate(shift.hourly_pay_cents ?? 0);
  const venueName = shift.business?.name ?? shift.business_name ?? 'Venue';
  const area = shift.business?.city ?? shift.city ?? shift.location ?? '';
  const start = getShiftStart(shift);
  if (__DEV__) console.log(`[RushFeed] Card render: shift ${shift.id} start parsed: ${start !== null}`);
  const rel = start ? formatRelativeTime(start) : null;
  const abs = start ? formatAbsoluteTime(start) : null;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: 'rgba(255,68,68,0.35)',
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        web: { boxShadow: '0 0 16px rgba(255,68,68,0.15)' },
        default: { shadowColor: '#FF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
      }),
    }}>
      {/* Top row: pay + role badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: COLORS.text, fontSize: 32, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '800', letterSpacing: -1 }}>
          {payDisplay}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' }}>
            <Text style={{ color: '#FF6B6B', fontSize: 12, fontFamily: 'SpaceGrotesk-Bold' }}>
              🔥 RUSH
            </Text>
          </View>
          <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {capitalize(shift.role)}
            </Text>
          </View>
        </View>
      </View>

      {/* Venue + area */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <MaterialIcons name="place" size={14} color={COLORS.textSecondary} />
        <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
          {venueName}
        </Text>
        {!!area && (
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
            · {area}
          </Text>
        )}
      </View>

      {/* Start time */}
      {!!start && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <MaterialIcons name="schedule" size={14} color={COLORS.accent} />
          <Text style={{ color: COLORS.accent, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
            {rel}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
            — starts {abs}
          </Text>
        </View>
      )}

      {/* Claim button */}
      <AnimatedPressable onPress={() => onClaim(shift)} disabled={!!claimingId}>
        <Animated.View style={{
          backgroundColor: isClaiming ? COLORS.dangerMuted : COLORS.danger,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: claimingId && !isClaiming ? 0.5 : 1,
          transform: [{ scale: isClaiming ? 1 : pulseAnim }],
        }}>
          {isClaiming
            ? <ActivityIndicator color="#fff" size="small" />
            : <MaterialIcons name="bolt" size={18} color="#fff" />}
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>
            {isClaiming ? 'Claiming...' : 'Claim Shift'}
          </Text>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

// ─── Claim Result Modal ───────────────────────────────────────────────────────

interface ClaimResultModalProps {
  visible: boolean;
  result: 'success' | 'race_lost' | 'error' | null;
  shift: RushShift | null;
  errorMessage?: string;
  onDismiss: () => void;
}

function ClaimResultModal({ visible, result, shift, errorMessage, onDismiss }: ClaimResultModalProps) {
  useEffect(() => {
    if (result !== 'success') return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  if (!visible || !result) return null;

  const venueName = shift?.business?.name ?? shift?.business_name ?? 'the venue';
  const startDate = shift ? getShiftStart(shift) : null;
  const abs = startDate ? formatAbsoluteTime(startDate) : null;
  const address = shift?.business?.address ?? shift?.address ?? '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {result === 'success' && (
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: 'rgba(0,255,135,0.15)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              ...Platform.select({
                web: { boxShadow: '0 0 40px rgba(0,255,135,0.4)' },
                default: { shadowColor: '#00FF87', shadowOpacity: 0.4, shadowRadius: 30, elevation: 12 },
              }),
            }}>
              <Text style={{ fontSize: 52 }}>✅</Text>
            </View>
            <Text style={{ color: COLORS.primary, fontSize: 28, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', marginBottom: 8 }}>
              You got it!
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 16, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center', marginBottom: 6 }}>
              See you at {venueName}{abs ? ` at ${abs}` : ''}
            </Text>
            {!!address && (
              <Pressable onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                if (__DEV__) console.log(`[RushFeed] Address tap: opening maps for ${address}`);
                Linking.openURL(url).catch(err => console.warn('[RushFeed] Failed to open maps:', err));
              }}>
                <Text style={{ color: COLORS.accent, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center', marginBottom: 32, textDecorationLine: 'underline' }}>
                  📍 {address}
                </Text>
              </Pressable>
            )}
            <Text style={{ color: COLORS.textTertiary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
              Dismissing automatically...
            </Text>
          </View>
        )}

        {result === 'race_lost' && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 40 }}>⚡</Text>
            </View>
            <Text style={{ color: COLORS.text, fontSize: 24, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', marginBottom: 10 }}>
              Just missed it
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              Someone else just claimed this one — we'll keep looking for your next opportunity.
            </Text>
            <AnimatedPressable onPress={onDismiss}>
              <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold' }}>Back to Feed</Text>
              </View>
            </AnimatedPressable>
          </View>
        )}

        {result === 'error' && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.dangerMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <MaterialIcons name="error" size={40} color={COLORS.danger} />
            </View>
            <Text style={{ color: COLORS.danger, fontSize: 22, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', marginBottom: 10 }}>
              Couldn't Claim
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
              {errorMessage ?? 'An error occurred. Please try again.'}
            </Text>
            <AnimatedPressable onPress={onDismiss}>
              <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold' }}>Back to Feed</Text>
              </View>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RushFeedSection({ isAvailableNow, hasTemplate, onGoToTemplate }: RushFeedSectionProps) {
  const router = useRouter();
  const [rushShifts, setRushShifts] = useState<RushShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{
    visible: boolean;
    result: 'success' | 'race_lost' | 'error' | null;
    shift: RushShift | null;
    errorMessage?: string;
  }>({ visible: false, result: null, shift: null });

  const loadFeed = useCallback(async () => {
    try {
      const data = await authenticatedGet<{ shifts?: RushShift[] } | RushShift[]>('/api/shifts/rush-feed');
      const list = Array.isArray(data) ? data : (data as any)?.shifts ?? [];
      setRushShifts(list);
      console.log(`[Rush] Feed loaded: ${list.length} shifts`);
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 30s
  useEffect(() => {
    loadFeed();
    const interval = setInterval(loadFeed, 30000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  const handleClaim = async (shift: RushShift) => {
    console.log(`[Rush] Claim attempt: ${shift.id}`);
    setClaimingId(shift.id);
    try {
      await authenticatedPost(`/api/shifts/${shift.id}/claim`, {});
      console.log(`[Rush] Claim success: ${shift.id}`);
      setRushShifts((prev) => prev.filter((s) => s.id !== shift.id));
      setClaimResult({ visible: true, result: 'success', shift });
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      let statusCode = 0;
      const match = msg.match(/API error (\d+)/);
      if (match) statusCode = Number(match[1]);

      if (statusCode === 409) {
        console.log(`[Rush] Claim race-lost: ${shift.id}`);
        setRushShifts((prev) => prev.filter((s) => s.id !== shift.id));
        setClaimResult({ visible: true, result: 'race_lost', shift });
      } else {
        console.log(`[Rush] Claim error: ${shift.id} — ${msg}`);
        // Extract server error message from JSON if present
        let serverMsg = msg;
        try {
          const jsonStart = msg.indexOf('{');
          if (jsonStart !== -1) {
            const parsed = JSON.parse(msg.slice(jsonStart));
            serverMsg = parsed.error ?? parsed.message ?? msg;
          }
        } catch {}
        setClaimResult({ visible: true, result: 'error', shift, errorMessage: serverMsg });
      }
    } finally {
      setClaimingId(null);
    }
  };

  const dismissResult = useCallback(() => {
    setClaimResult({ visible: false, result: null, shift: null });
    loadFeed(); // Refresh after dismissal
  }, [loadFeed]);

  // Gate: not available and no template — show CTA
  if (!isAvailableNow && !hasTemplate) {
    return (
      <View style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,184,0,0.25)',
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
      }}>
        <MaterialIcons name="bolt" size={32} color={COLORS.accent} style={{ marginBottom: 10 }} />
        <Text style={{ color: COLORS.text, fontSize: 16, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', marginBottom: 6 }}>
          Set Your Availability
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
          Tell us when you typically work to receive rush shift alerts.
        </Text>
        <AnimatedPressable onPress={onGoToTemplate}>
          <View style={{ backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: '#000', fontSize: 14, fontFamily: 'SpaceGrotesk-Bold' }}>Set Schedule</Text>
          </View>
        </AnimatedPressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={{ color: COLORS.danger, fontSize: 14, fontFamily: 'SpaceGrotesk-Bold' }}>🔥 Rush Shifts</Text>
        </View>
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 32, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.danger} />
        </View>
      </View>
    );
  }

  if (rushShifts.length === 0) {
    return (
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={{ color: COLORS.danger, fontSize: 14, fontFamily: 'SpaceGrotesk-Bold' }}>🔥 Rush Shifts</Text>
        </View>
        <View style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 28,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 32, marginBottom: 10 }}>🔍</Text>
          <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center', marginBottom: 6 }}>
            No rush shifts right now
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 20 }}>
            We'll ping you the moment one drops near you.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: COLORS.danger, fontSize: 14, fontFamily: 'SpaceGrotesk-Bold' }}>🔥 Rush Shifts</Text>
          <View style={{ backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: COLORS.danger, fontSize: 11, fontFamily: 'SpaceGrotesk-Bold' }}>{rushShifts.length}</Text>
          </View>
        </View>
        <Text style={{ color: COLORS.textTertiary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular' }}>
          Updates every 30s
        </Text>
      </View>

      {/* Cards */}
      {rushShifts.map((shift) => (
        <RushShiftCard
          key={shift.id}
          shift={shift}
          onClaim={handleClaim}
          claimingId={claimingId}
        />
      ))}

      {/* Claim result modal */}
      <ClaimResultModal
        visible={claimResult.visible}
        result={claimResult.result}
        shift={claimResult.shift}
        errorMessage={claimResult.errorMessage}
        onDismiss={dismissResult}
      />
    </View>
  );
}
