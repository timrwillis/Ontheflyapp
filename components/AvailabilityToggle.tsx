import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, Platform } from 'react-native';
import { COLORS } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface AvailabilityToggleProps {
  isAvailable: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export function AvailabilityToggle({ isAvailable, onToggle, loading }: AvailabilityToggleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const thumbPosition = useRef(new Animated.Value(isAvailable ? 1 : 0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(thumbPosition, {
      toValue: isAvailable ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvailable]);

  useEffect(() => {
    if (!isAvailable) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseScale, { toValue: 2.2, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.parallel([
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvailable]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 4 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 4 }),
    ]).start();
    onToggle();
  };

  const thumbLeft = thumbPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 25],
  });

  const statusText = isAvailable ? "You're Live" : 'Go Live to find shifts';
  const subText = isAvailable ? 'Workers can see you' : 'Toggle on to get shift alerts';
  const bgColor = isAvailable ? COLORS.primaryMuted : COLORS.surfaceSecondary;
  const borderColor = isAvailable ? COLORS.primary : COLORS.border;
  const textColor = isAvailable ? COLORS.primary : COLORS.textSecondary;

  const glowStyle = isAvailable
    ? Platform.select({
        web: { boxShadow: '0 0 20px rgba(0, 255, 135, 0.25)' },
        default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
      }) as object
    : {};

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        style={{
          backgroundColor: bgColor,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: loading ? 0.6 : 1,
          ...glowStyle,
        }}
      >
        {/* Icon with pulsing dot */}
        <View style={{ position: 'relative', width: 48, height: 48 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isAvailable ? COLORS.primary : COLORS.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="bolt" size={24} color={isAvailable ? '#000' : COLORS.textSecondary} />
          </View>
          {isAvailable && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: COLORS.primary,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              }}
            />
          )}
          {isAvailable && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: COLORS.primary,
              }}
            />
          )}
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: textColor,
              fontSize: 17,
              fontWeight: '700',
              fontFamily: 'SpaceGrotesk-Bold',
            }}
          >
            {statusText}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              fontFamily: 'SpaceGrotesk-Regular',
              marginTop: 2,
            }}
          >
            {subText}
          </Text>
        </View>

        {/* Toggle track */}
        <View
          style={{
            width: 52,
            height: 30,
            borderRadius: 15,
            backgroundColor: isAvailable ? COLORS.primary : COLORS.surfaceElevated,
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isAvailable ? COLORS.primary : COLORS.border,
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: thumbLeft,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: isAvailable ? '#000' : COLORS.textTertiary,
            }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
