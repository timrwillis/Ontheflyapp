import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { authenticatedPost } from '@/utils/api';
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

function InputField({ label, value, onChangeText, placeholder, multiline, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 8 }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: focused ? COLORS.primary : 'rgba(255,255,255,0.1)',
          padding: 14,
          color: COLORS.text,
          fontSize: 15,
          fontFamily: 'SpaceGrotesk-Regular',
          minHeight: multiline ? 88 : 50,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export default function WorkerProfileStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [hasTransportation, setHasTransportation] = useState(false);
  const [radius, setRadius] = useState('10');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Required', 'Please enter your city.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim() || undefined,
        hasTransportation,
        preferredRadiusMiles: Number(radius) || 10,
      };
      await authenticatedPost('/api/onboarding/worker', payload);
      router.push('/onboarding/worker/roles');
    } catch (err) {
      console.error('[WorkerOnboarding] Profile save failed:', err);
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
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i === 0 ? COLORS.primary : 'rgba(255,255,255,0.1)' }} />
        ))}
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 6 }}>
        STEP 1 OF 4
      </Text>
      <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, marginBottom: 6 }}>
        Your Profile
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 28, lineHeight: 22 }}>
        Tell managers who you are and where you're located.
      </Text>

      <View style={{ ...glass, marginBottom: 16 }}>
        <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" />
        <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />
        <InputField label="City" value={city} onChangeText={setCity} placeholder="e.g. Chicago, IL" />
        <InputField label="Bio (optional)" value={bio} onChangeText={setBio} placeholder="Tell managers about your experience..." multiline />
      </View>

      {/* Transportation toggle */}
      <View style={{ ...glass, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 2 }}>
            I have transportation
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
            Own vehicle or reliable transit
          </Text>
        </View>
        <Switch
          value={hasTransportation}
          onValueChange={setHasTransportation}
          trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primaryMuted }}
          thumbColor={hasTransportation ? COLORS.primary : COLORS.textSecondary}
        />
      </View>

      {/* Radius */}
      <View style={{ ...glass, marginBottom: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          PREFERRED RADIUS (MILES)
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['5', '10', '15', '25', '50'].map((r) => {
            const isActive = radius === r;
            return (
              <AnimatedPressable key={r} onPress={() => setRadius(r)}>
                <View style={{
                  backgroundColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.1)',
                }}>
                  <Text style={{ color: isActive ? '#000' : COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {r} mi
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      <AnimatedPressable onPress={handleNext} disabled={loading}>
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
          <Text style={{ color: '#000', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
          {!loading && <MaterialIcons name="arrow-forward" size={18} color="#000" />}
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
