import React from 'react';
import { Text, TextStyle, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';

interface WorkerNameLinkProps {
  workerId: string;
  name: string;
  style?: TextStyle;
}

export function WorkerNameLink({ workerId, name, style }: WorkerNameLinkProps) {
  const router = useRouter();

  if (!workerId) {
    return (
      <Text style={[{ color: COLORS.text, fontFamily: 'SpaceGrotesk-SemiBold' }, style]}>
        {name}
      </Text>
    );
  }

  return (
    <Pressable onPress={() => router.push(`/worker/${workerId}` as any)}>
      <Text style={[{
        color: COLORS.primary,
        fontFamily: 'SpaceGrotesk-SemiBold',
        textDecorationLine: 'underline',
        textDecorationColor: 'rgba(0,255,135,0.4)',
      }, style]}>
        {name}
      </Text>
    </Pressable>
  );
}
