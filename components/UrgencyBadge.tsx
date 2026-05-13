import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { COLORS } from '@/constants/Colors';

const URGENCY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; pulse: boolean }> = {
  tonight:   { bg: 'rgba(255, 68, 68, 0.18)',   text: '#FF6B6B', border: 'rgba(255, 68, 68, 0.5)',   label: '🔴 TONIGHT',   pulse: true },
  tomorrow:  { bg: 'rgba(255, 184, 0, 0.18)',   text: '#FFB800', border: 'rgba(255, 184, 0, 0.5)',   label: '🟡 TOMORROW',  pulse: false },
  this_week: { bg: 'rgba(96, 165, 250, 0.18)',  text: '#60A5FA', border: 'rgba(96, 165, 250, 0.5)',  label: '🔵 THIS WEEK', pulse: false },
  future:    { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)', label: 'UPCOMING',     pulse: false },
};

interface UrgencyBadgeProps {
  urgency: string;
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const key = urgency?.toLowerCase() ?? 'future';
  const config = URGENCY_CONFIG[key] ?? URGENCY_CONFIG['future'];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (config.pulse) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      anim.start();
      return () => { anim.stop(); };
    }
    return undefined;
  }, [config.pulse, pulseAnim]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {config.pulse && (
        <Animated.View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: COLORS.danger,
            opacity: pulseAnim,
          }}
        />
      )}
      <View
        style={{
          backgroundColor: config.bg,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderWidth: 1,
          borderColor: config.border,
        }}
      >
        <Text
          style={{
            color: config.text,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            fontFamily: 'SpaceGrotesk-Bold',
          }}
        >
          {config.label}
        </Text>
      </View>
    </View>
  );
}
