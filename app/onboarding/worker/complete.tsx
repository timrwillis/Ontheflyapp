import React, { useState, useEffect } from 'react';
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

const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
}) as object;

export default function WorkerOnboardingComplete() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workerProfile, currentUser, refreshWorkerProfile, refreshOnboardingStatus } = useRole();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    refreshWorkerProfile().finally(() => {
      setProfileLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = workerProfile?.name ?? currentUser?.name ?? 'Worker';
  const city = workerProfile?.city ?? '—';
  const roles = workerProfile?.roles ?? [];
  const days = workerProfile?.availability_days ?? [];

  const handleStart = async () => {
    setLoading(true);
    try {
      await authenticatedPost('/api/onboarding/complete', {});
      await Promise.all([refreshWorkerProfile(), refreshOnboardingStatus()]);
      router.replace('/(tabs)/(home)');
    } catch (err) {
      Alert.alert('Error', 'Could not complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const daysDisplay = days.length > 0 ? days.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') : 'Not set';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 40 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: COLORS.primary }} />
        ))}
      </View>

      {/* Hero */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: COLORS.primaryMuted,
          borderWidth: 3,
          borderColor: COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          ...primaryGlow,
        }}>
          <Text style={{ fontSize: 40 }}>⚡</Text>
        </View>
        <Text style={{ color: COLORS.primary, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8 }}>
          You're all set!
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 24 }}>
          Your worker profile is ready. Start finding shifts near you.
        </Text>
      </View>

      {/* Summary */}
      <View style={{ ...glass, marginBottom: 24 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
          PROFILE SUMMARY
        </Text>
        {[
          { icon: 'person' as const, label: 'Name', value: name },
          { icon: 'place' as const, label: 'City', value: city },
          { icon: 'work' as const, label: 'Roles', value: roles.length > 0 ? roles.slice(0, 3).join(', ') : 'Not set' },
          { icon: 'calendar-today' as const, label: 'Available', value: daysDisplay },
        ].map((item, i) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 }}>
            <MaterialIcons name={item.icon} size={16} color={profileLoading ? 'rgba(0,255,135,0.3)' : COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', width: 70 }}>{item.label}</Text>
            <Text style={{ color: profileLoading ? 'rgba(255,255,255,0.2)' : COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }} numberOfLines={1}>
              {profileLoading ? '···' : item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* What's next */}
      <View style={{ ...glass, marginBottom: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
          WHAT HAPPENS NEXT
        </Text>
        {[
          { icon: '🔍', text: 'Browse open shifts near you' },
          { icon: '⚡', text: 'Apply with one tap' },
          { icon: '✅', text: 'Get confirmed by managers' },
          { icon: '💰', text: 'Show up and get paid' },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{item.text}</Text>
          </View>
        ))}
      </View>

      <AnimatedPressable onPress={handleStart} disabled={loading}>
        <View style={{
          backgroundColor: loading ? 'rgba(0,255,135,0.5)' : COLORS.primary,
          borderRadius: 16,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          ...primaryGlow,
        }}>
          <MaterialIcons name="search" size={20} color="#000" />
          <Text style={{ color: '#000', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>
            {loading ? 'Setting up...' : 'Start Finding Shifts'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
