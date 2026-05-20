import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { apiPost } from '@/utils/api';
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

export default function ManagerProfileStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    console.log('[ManagerOnboarding] Profile step submit pressed');
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    setLoading(true);
    try {
      const payload = { phone: phone.trim() };
      await apiPost('/api/onboarding/manager', payload);
      router.push('/onboarding/manager/business');
    } catch {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i === 0 ? COLORS.accent : 'rgba(255,255,255,0.1)' }} />
        ))}
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 6 }}>
        STEP 1 OF 3
      </Text>
      <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, marginBottom: 6 }}>
        Contact Info
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 28, lineHeight: 22 }}>
        We'll use this to send you shift notifications and worker confirmations.
      </Text>

      <View style={{ ...glass, marginBottom: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 8 }}>
          PHONE NUMBER
        </Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="phone-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: focused ? COLORS.accent : 'rgba(255,255,255,0.1)',
            padding: 14,
            color: COLORS.text,
            fontSize: 15,
            fontFamily: 'SpaceGrotesk-Regular',
            height: 50,
          }}
        />
      </View>

      <AnimatedPressable onPress={handleNext} disabled={loading}>
        <View style={{
          backgroundColor: loading ? 'rgba(255,184,0,0.5)' : COLORS.accent,
          borderRadius: 16,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
          <Text style={{ color: '#000', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
          {!loading && <MaterialIcons name="arrow-forward" size={18} color="#000" />}
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
