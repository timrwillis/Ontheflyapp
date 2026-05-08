import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { CheckCircle } from 'lucide-react-native';

export interface WorkerProfile {
  id: string;
  user_id?: string;
  name: string;
  city?: string;
  roles?: string[];
  reliability_score?: number;
  is_available?: boolean;
  is_verified?: boolean;
  is_suspended?: boolean;
  completed_shifts?: number;
  avg_rating?: number;
  hourly_rate?: number;
}

interface WorkerCardProps {
  worker: WorkerProfile;
  onPress?: () => void;
  showAdminActions?: boolean;
  onVerify?: () => void;
  onSuspend?: () => void;
  index?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function WorkerCard({ worker, onPress, showAdminActions, onVerify, onSuspend, index = 0 }: WorkerCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  const initials = getInitials(worker.name ?? 'U');
  const roles = worker.roles ?? [];
  const score = worker.reliability_score ?? 0;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress}>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 16,
            marginBottom: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: COLORS.primaryMuted,
                  borderWidth: 2,
                  borderColor: worker.is_available ? COLORS.primary : COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 18,
                    fontWeight: '700',
                    fontFamily: 'SpaceGrotesk-Bold',
                  }}
                >
                  {initials}
                </Text>
              </View>
              {/* Availability dot */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 1,
                  right: 1,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: worker.is_available ? COLORS.primary : COLORS.textTertiary,
                  borderWidth: 2,
                  borderColor: COLORS.surface,
                }}
              />
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 16,
                    fontWeight: '700',
                    fontFamily: 'SpaceGrotesk-Bold',
                  }}
                  numberOfLines={1}
                >
                  {worker.name}
                </Text>
                {worker.is_verified && (
                  <CheckCircle size={14} color={COLORS.primary} fill={COLORS.primary} />
                )}
              </View>
              {worker.city && (
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 12,
                    fontFamily: 'SpaceGrotesk-Regular',
                    marginBottom: 6,
                  }}
                >
                  {worker.city}
                </Text>
              )}
              {/* Role chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {roles.slice(0, 3).map((role) => (
                  <View
                    key={role}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 10,
                        fontWeight: '600',
                        fontFamily: 'SpaceGrotesk-SemiBold',
                      }}
                    >
                      {role}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Score */}
            <ReliabilityScore score={score} size={52} showLabel={false} />
          </View>

          {/* Admin actions */}
          {showAdminActions && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider }}>
              {!worker.is_verified && (
                <AnimatedPressable
                  onPress={() => {
                    console.log('[WorkerCard] Verify worker pressed:', worker.id);
                    onVerify?.();
                  }}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 8,
                      paddingVertical: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                      Verify
                    </Text>
                  </View>
                </AnimatedPressable>
              )}
              <AnimatedPressable
                onPress={() => {
                  console.log('[WorkerCard] Suspend worker pressed:', worker.id);
                  onSuspend?.();
                }}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    backgroundColor: worker.is_suspended ? COLORS.primaryMuted : COLORS.dangerMuted,
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: worker.is_suspended ? COLORS.primary : COLORS.danger,
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'SpaceGrotesk-SemiBold',
                    }}
                  >
                    {worker.is_suspended ? 'Reinstate' : 'Suspend'}
                  </Text>
                </View>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
