import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { authenticatedPost, getBearerToken } from '@/utils/api';
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

export default function OnboardingRoleSelector() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setRole } = useRole();
  const [loading, setLoading] = useState<'manager' | 'worker' | null>(null);

  const handleSelectRole = async (role: 'manager' | 'worker') => {
    setLoading(role);
    try {
      // After sign-up/sign-in, the reactive useSession effect in AuthProvider
      // writes the bearer token to SecureStore asynchronously. Poll briefly
      // so the write is guaranteed before the API call. We do NOT call
      // fetchUser() here — its getSession() round-trip can race and call
      // clearAuthTokens(), wiping a token that was already correctly set.
      let token = await getBearerToken();
      if (!token) {
        await new Promise<void>((r) => setTimeout(r, 600));
        token = await getBearerToken();
      }
      if (!token) {
        await new Promise<void>((r) => setTimeout(r, 1000));
        token = await getBearerToken();
      }
      await authenticatedPost('/api/onboarding/role', { role });
      await setRole(role);
      if (role === 'worker') {
        router.push('/onboarding/worker/profile');
      } else {
        router.push('/onboarding/manager/profile');
      }
    } catch (err) {
      console.error('[Onboarding] Role selection failed:', err);
      Alert.alert('Error', 'Could not set your role. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚡</Text>
        <Text style={{ color: COLORS.primary, fontSize: 28, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1, textAlign: 'center', marginBottom: 10 }}>
          Welcome to On The Fly
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 24 }}>
          The fastest way to fill shifts and find work in hospitality.
        </Text>
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, textAlign: 'center', marginBottom: 20 }}>
        HOW WILL YOU USE ON THE FLY?
      </Text>

      {/* Worker card */}
      <AnimatedPressable
        onPress={() => handleSelectRole('worker')}
        style={{ marginBottom: 14 }}
      >
        <View style={{
          ...glass,
          borderRadius: 20,
          padding: 24,
          borderColor: loading === 'worker' ? COLORS.primary : 'rgba(255,255,255,0.08)',
          borderWidth: loading === 'worker' ? 2 : 1,
          ...(loading === 'worker' ? primaryGlow : {}),
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="bolt" size={28} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 2 }}>
                {loading === 'worker' ? 'Setting up...' : "I'm a Worker"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                Find shifts and get paid fast
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Bartender', 'Server', 'Cook', 'Event Staff', 'Security'].map((r) => (
              <View key={r} style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: COLORS.primary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold' }}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
      </AnimatedPressable>

      {/* Manager card */}
      <AnimatedPressable
        onPress={() => handleSelectRole('manager')}
        style={{ marginBottom: 32 }}
      >
        <View style={{
          ...glass,
          borderRadius: 20,
          padding: 24,
          borderColor: loading === 'manager' ? COLORS.accent : 'rgba(255,255,255,0.08)',
          borderWidth: loading === 'manager' ? 2 : 1,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accentMuted, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="business" size={28} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 2 }}>
                {loading === 'manager' ? 'Setting up...' : "I'm a Manager"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                Post shifts and fill them in minutes
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={COLORS.accent} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Bar', 'Restaurant', 'Hotel', 'Event Venue', 'Nightclub'].map((t) => (
              <View key={t} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: COLORS.accent, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold' }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </AnimatedPressable>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { value: '4 min', label: 'avg fill time' },
          { value: '94%', label: 'fill rate' },
          { value: '500+', label: 'workers' },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{s.value}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
