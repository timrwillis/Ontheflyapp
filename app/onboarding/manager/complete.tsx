import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { authenticatedPost } from '@/utils/api';
import { useRole } from '@/contexts/RoleContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

export default function ManagerOnboardingComplete() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, refreshOnboardingStatus } = useRole();
  // refreshOnboardingStatus is called after completing so the tabs layout
  // doesn't re-check and redirect back to onboarding.
  const [loading, setLoading] = useState(false);

  const businessName = currentUser?.business_name ?? 'Your Business';

  const handleStart = async () => {
    setLoading(true);
    try {
      await authenticatedPost('/api/onboarding/complete', {});
      await refreshOnboardingStatus();
      router.replace('/(tabs)/(home)');
    } catch (err) {
      Alert.alert('Error', 'Could not complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 40 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: COLORS.accent }} />
        ))}
      </View>

      {/* Hero */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: COLORS.accentMuted,
          borderWidth: 3,
          borderColor: COLORS.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 40 }}>🏢</Text>
        </View>
        <Text style={{ color: COLORS.accent, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 }}>
          Business profile created!
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 24 }}>
          {businessName}
          {' is ready to start posting shifts.'}
        </Text>
      </View>

      {/* What's next */}
      <View style={{ ...glass, marginBottom: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
          WHAT HAPPENS NEXT
        </Text>
        {[
          { icon: '⚡', text: 'Post a shift in under 15 seconds' },
          { icon: '👥', text: 'Workers apply instantly' },
          { icon: '✅', text: 'Confirm the best candidates' },
          { icon: '🎉', text: 'Your shift is covered' },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{item.text}</Text>
          </View>
        ))}
      </View>

      <AnimatedPressable onPress={handleStart} disabled={loading}>
        <View style={{
          backgroundColor: loading ? 'rgba(255,184,0,0.5)' : COLORS.accent,
          borderRadius: 16,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
          <MaterialIcons name="add" size={20} color="#000" />
          <Text style={{ color: '#000', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>
            {loading ? 'Setting up...' : 'Post Your First Shift'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
