import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Platform } from 'react-native';
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

const BUSINESS_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'event_venue', label: 'Event Venue' },
  { value: 'nightclub', label: 'Nightclub' },
  { value: 'catering', label: 'Catering' },
  { value: 'other', label: 'Other' },
];

function InputField({ label, value, onChangeText, placeholder, multiline, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'url';
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
          borderColor: focused ? COLORS.accent : 'rgba(255,255,255,0.1)',
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

export default function ManagerBusinessStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your business name.'); return; }
    if (!type) { Alert.alert('Required', 'Please select a business type.'); return; }
    if (!city.trim()) { Alert.alert('Required', 'Please enter your city.'); return; }
    if (!address.trim()) { Alert.alert('Required', 'Please enter your address.'); return; }
    if (!phone.trim()) { Alert.alert('Required', 'Please enter a business phone number.'); return; }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim() || undefined,
        website: website.trim() || undefined,
      };
      await authenticatedPost('/api/onboarding/business', payload);
      router.push('/onboarding/manager/complete');
    } catch (err) {
      console.error('[ManagerOnboarding] Business save failed:', err);
      Alert.alert('Error', 'Could not save your business. Please try again.');
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
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= 1 ? COLORS.accent : 'rgba(255,255,255,0.1)' }} />
        ))}
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 6 }}>
        STEP 2 OF 3
      </Text>
      <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, marginBottom: 6 }}>
        Your Business
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 28, lineHeight: 22 }}>
        Workers will see this when applying to your shifts.
      </Text>

      <View style={{ ...glass, marginBottom: 16 }}>
        <InputField label="Business Name" value={name} onChangeText={setName} placeholder="e.g. The Grand Hotel" />
        <InputField label="City" value={city} onChangeText={setCity} placeholder="e.g. Chicago, IL" />
        <InputField label="Address" value={address} onChangeText={setAddress} placeholder="e.g. 123 Main St" />
        <InputField label="Business Phone" value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />
        <InputField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Tell workers about your venue..." multiline />
        <InputField label="Website (optional)" value={website} onChangeText={setWebsite} placeholder="https://yourvenue.com" keyboardType="url" />
      </View>

      {/* Business type */}
      <View style={{ ...glass, marginBottom: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
          BUSINESS TYPE
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BUSINESS_TYPES.map((bt) => {
            const isActive = type === bt.value;
            return (
              <AnimatedPressable key={bt.value} onPress={() => setType(bt.value)}>
                <View style={{
                  backgroundColor: isActive ? COLORS.accent : 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.accent : 'rgba(255,255,255,0.1)',
                }}>
                  <Text style={{ color: isActive ? '#000' : COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {bt.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
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
