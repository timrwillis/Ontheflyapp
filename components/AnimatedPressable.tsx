import { Pressable, Animated, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { useRef, useCallback } from 'react';

interface AnimatedPressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  disabled?: boolean;
  scaleValue?: number;
}

export function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
  scaleValue = 0.97,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale, scaleValue]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  if (Platform.OS === 'web') {
    return (
      <View style={disabled ? { opacity: 0.5 } : undefined}>
        <Pressable
          onPressIn={animateIn}
          onPressOut={animateOut}
          onPress={onPress}
          disabled={disabled}
          style={style}
        >
          {children}
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
