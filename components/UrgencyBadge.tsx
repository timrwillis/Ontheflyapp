import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS } from '@/constants/Colors';

const URGENCY_CONFIG: Record<string, { bg: string; text: string; label: string; pulse: boolean }> = {
  tonight: { bg: COLORS.dangerMuted, text: COLORS.danger, label: 'TONIGHT', pulse: true },
  tomorrow: { bg: COLORS.accentMuted, text: COLORS.accent, label: 'TOMORROW', pulse: false },
  'this week': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA', label: 'THIS WEEK', pulse: false },
  future: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', label: 'FUTURE', pulse: false },
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
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
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
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: COLORS.danger,
            opacity: pulseAnim,
          }}
        />
      )}
      <View
        style={{
          backgroundColor: config.bg,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <Text
          style={{
            color: config.text,
            fontSize: 10,
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
