import React from 'react';
import { View, Text } from 'react-native';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Bartender: { bg: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA' },
  Server: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' },
  Cook: { bg: 'rgba(249, 115, 22, 0.2)', text: '#FB923C' },
  Dishwasher: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF' },
  Host: { bg: 'rgba(20, 184, 166, 0.2)', text: '#2DD4BF' },
  'Event Staff': { bg: 'rgba(236, 72, 153, 0.2)', text: '#F472B6' },
};

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const colors = ROLE_COLORS[role] ?? { bg: 'rgba(0, 255, 135, 0.12)', text: '#00FF87' };
  const fontSize = size === 'sm' ? 10 : 12;
  const paddingH = size === 'sm' ? 6 : 8;
  const paddingV = size === 'sm' ? 2 : 4;

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: 6,
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize,
          fontWeight: '600',
          fontFamily: 'SpaceGrotesk-SemiBold',
        }}
      >
        {role}
      </Text>
    </View>
  );
}
