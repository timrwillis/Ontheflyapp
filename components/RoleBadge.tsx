import React from 'react';
import { View, Text } from 'react-native';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Bartender:    { bg: 'rgba(139, 92, 246, 0.2)',  text: '#A78BFA', border: 'rgba(167, 139, 250, 0.4)' },
  Server:       { bg: 'rgba(59, 130, 246, 0.2)',  text: '#60A5FA', border: 'rgba(96, 165, 250, 0.4)' },
  Cook:         { bg: 'rgba(249, 115, 22, 0.2)',  text: '#FB923C', border: 'rgba(251, 146, 60, 0.4)' },
  Dishwasher:   { bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.4)' },
  Host:         { bg: 'rgba(20, 184, 166, 0.2)',  text: '#2DD4BF', border: 'rgba(45, 212, 191, 0.4)' },
  'Event Staff':{ bg: 'rgba(236, 72, 153, 0.2)',  text: '#F472B6', border: 'rgba(244, 114, 182, 0.4)' },
};

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const colors = ROLE_COLORS[role] ?? { bg: 'rgba(0, 255, 135, 0.12)', text: '#00FF87', border: 'rgba(0, 255, 135, 0.35)' };
  const fontSize = size === 'sm' ? 10 : 12;
  const paddingH = size === 'sm' ? 6 : 8;
  const paddingV = size === 'sm' ? 2 : 4;

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
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
