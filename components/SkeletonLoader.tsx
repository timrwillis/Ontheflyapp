import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface SkeletonLineProps {
  width: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLine({ width, height = 14, borderRadius, style }: SkeletonLineProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? height / 2,
          backgroundColor: COLORS.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ShiftCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLine width={80} height={24} borderRadius={6} />
        <SkeletonLine width={60} height={20} borderRadius={6} />
      </View>
      <SkeletonLine width={"70%"} height={18} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SkeletonLine width={100} height={14} />
        <SkeletonLine width={80} height={14} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLine width={60} height={28} />
        <SkeletonLine width={100} height={40} borderRadius={10} />
      </View>
    </View>
  );
}

export function WorkerCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <SkeletonLine width={52} height={52} borderRadius={26} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonLine width={"60%"} height={16} />
        <SkeletonLine width={"40%"} height={13} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SkeletonLine width={60} height={22} borderRadius={6} />
          <SkeletonLine width={50} height={22} borderRadius={6} />
        </View>
      </View>
      <SkeletonLine width={44} height={44} borderRadius={22} />
    </View>
  );
}
