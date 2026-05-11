import React, { useRef } from 'react';
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

  const handlePress = () => {
    console.log('[AvailabilityToggle] Toggling availability:', !isAvailable);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 4 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 50, bounciness: 4 }),
    ]).start();
    onToggle();
  };

  const statusText = isAvailable ? 'Available Now' : 'Off Duty';
  const subText = isAvailable ? 'You\'ll receive shift alerts' : 'Toggle on to find shifts';
  const bgColor = isAvailable ? COLORS.primaryMuted : COLORS.surfaceSecondary;
  const borderColor = isAvailable ? COLORS.primary : COLORS.border;
  const textColor = isAvailable ? COLORS.primary : COLORS.textSecondary;

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
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isAvailable ? COLORS.primary : COLORS.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isAvailable ? (
            <MaterialIcons name="bolt" size={22} color="#000" />
          ) : (
            <MaterialIcons name="bolt" size={22} color={COLORS.textSecondary} />
          )}
        </View>
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
        <View
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: isAvailable ? COLORS.primary : COLORS.surfaceElevated,
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: isAvailable ? '#000' : COLORS.textTertiary,
              alignSelf: isAvailable ? 'flex-end' : 'flex-start',
            }}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
