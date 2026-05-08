import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/constants/Colors';

interface ReliabilityScoreProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.primary;
  if (score >= 60) return COLORS.accent;
  return COLORS.danger;
}

export function ReliabilityScore({ score, size = 64, showLabel = true }: ReliabilityScoreProps) {
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeScore / 100) * circumference;
  const color = getScoreColor(safeScore);
  const fontSize = size * 0.22;
  const labelSize = size * 0.14;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.surfaceSecondary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: color,
            fontSize,
            fontWeight: '700',
            fontFamily: 'SpaceGrotesk-Bold',
            lineHeight: fontSize * 1.2,
          }}
        >
          {safeScore}
        </Text>
        {showLabel && (
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: labelSize,
              fontFamily: 'SpaceGrotesk-Regular',
              lineHeight: labelSize * 1.3,
            }}
          >
            /100
          </Text>
        )}
      </View>
    </View>
  );
}
