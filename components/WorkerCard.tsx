import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export interface WorkerProfile {
  id: string;
  userId?: string;
  name: string;
  city?: string;
  roles?: string[];
  reliabilityScore?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  isSuspended?: boolean;
  completedShifts?: number;
  avgRating?: number;
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

function getScoreColor(score: number): string {
  if (score >= 95) return COLORS.primary;
  if (score >= 85) return COLORS.accent;
  return COLORS.danger;
}

const ROLE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  Bartender:    { bg: 'rgba(139, 92, 246, 0.2)',  text: '#A78BFA' },
  Server:       { bg: 'rgba(59, 130, 246, 0.2)',  text: '#60A5FA' },
  Cook:         { bg: 'rgba(249, 115, 22, 0.2)',  text: '#FB923C' },
  Dishwasher:   { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF' },
  Host:         { bg: 'rgba(20, 184, 166, 0.2)',  text: '#2DD4BF' },
  'Event Staff':{ bg: 'rgba(236, 72, 153, 0.2)',  text: '#F472B6' },
};

export function WorkerCard({ worker, onPress, showAdminActions, onVerify, onSuspend, index = 0 }: WorkerCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [index, opacity, translateY]);

  const initials = getInitials(worker.name ?? 'U');
  const roles = worker.roles ?? [];
  const score = worker.reliabilityScore ?? 0;
  const scoreColor = getScoreColor(score);
  const availabilityDotColor = worker.isAvailable ? COLORS.primary : COLORS.textTertiary;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable onPress={onPress}>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            padding: 16,
            marginBottom: 12,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }
              : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Avatar with availability ring */}
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: COLORS.primaryMuted,
                  borderWidth: 2.5,
                  borderColor: worker.isAvailable ? COLORS.primary : COLORS.border,
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
                  width: 13,
                  height: 13,
                  borderRadius: 7,
                  backgroundColor: availabilityDotColor,
                  borderWidth: 2,
                  borderColor: COLORS.surface,
                }}
              />
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
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
                {worker.isVerified && (
                  <MaterialIcons name="verified" size={15} color={COLORS.primary} />
                )}
              </View>
              {worker.city && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <MaterialIcons name="place" size={12} color={COLORS.textSecondary} />
                  <Text
                    style={{
                      color: COLORS.textSecondary,
                      fontSize: 12,
                      fontFamily: 'SpaceGrotesk-Regular',
                    }}
                  >
                    {worker.city}
                  </Text>
                </View>
              )}
              {/* Role pills */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {roles.slice(0, 3).map((role) => {
                  const pillColor = ROLE_PILL_COLORS[role] ?? { bg: COLORS.primaryMuted, text: COLORS.primary };
                  return (
                    <View
                      key={role}
                      style={{
                        backgroundColor: pillColor.bg,
                        borderRadius: 6,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          color: pillColor.text,
                          fontSize: 10,
                          fontWeight: '600',
                          fontFamily: 'SpaceGrotesk-SemiBold',
                        }}
                      >
                        {role}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Reliability score */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <ReliabilityScore score={score} size={52} showLabel={false} />
              <Text style={{ color: scoreColor, fontSize: 11, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
                {score}
              </Text>
            </View>
          </View>

          {/* Admin actions */}
          {showAdminActions && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.divider }}>
              {!worker.isVerified && (
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
                      borderWidth: 1,
                      borderColor: 'rgba(0, 255, 135, 0.3)',
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
                    backgroundColor: worker.isSuspended ? COLORS.primaryMuted : COLORS.dangerMuted,
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: worker.isSuspended ? COLORS.primary : COLORS.danger,
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'SpaceGrotesk-SemiBold',
                    }}
                  >
                    {worker.isSuspended ? 'Reinstate' : 'Suspend'}
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
