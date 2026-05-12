import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiPut } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const ROLES = ['Bartender', 'Server', 'Cook', 'Dishwasher', 'Host', 'Event Staff'];
const CERT_OPTIONS = ['TIPS', 'ServSafe', 'Food Handler', 'Alcohol Awareness'];

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
}) as object;

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: COLORS.primary }} />
      <MaterialIcons name={icon as any} size={16} color={COLORS.primary} />
      <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.3 }}>{title}</Text>
    </View>
  );
}

function InputField({ value, onChangeText, placeholder, multiline, keyboardType, label }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  label: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? COLORS.primary : 'rgba(255,255,255,0.1)';
  const focusShadow = focused ? Platform.select({
    web: { boxShadow: '0 0 0 2px rgba(0,255,135,0.2)' },
    default: {
      shadowColor: '#00FF87',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  }) as object : {};

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.8, marginBottom: 8 }}>
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
          borderColor,
          padding: 14,
          color: COLORS.text,
          fontSize: 15,
          fontFamily: 'SpaceGrotesk-Regular',
          minHeight: multiline ? 88 : 50,
          textAlignVertical: multiline ? 'top' : 'center',
          ...focusShadow,
        }}
      />
    </View>
  );
}

function ChipSelector({ options, selected, onToggle }: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <AnimatedPressable key={opt} onPress={() => { console.log('[EditProfile] Chip toggled:', opt); onToggle(opt); }}>
            <View style={{
              backgroundColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.04)',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderWidth: 1.5,
              borderColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.12)',
              ...(isActive ? Platform.select({
                web: { boxShadow: '0 0 10px rgba(0,255,135,0.3)' },
                default: {
                  shadowColor: '#00FF87',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                },
              }) as object : {}),
            }}>
              <Text style={{ color: isActive ? '#000' : COLORS.textSecondary, fontSize: 13, fontFamily: isActive ? 'SpaceGrotesk-Bold' : 'SpaceGrotesk-SemiBold' }}>
                {opt}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { currentUser, workerProfile, refreshWorkerProfile } = useRole();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [certs, setCerts] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workerProfile) {
      setName(workerProfile.name ?? '');
      setCity(workerProfile.city ?? '');
      setBio(workerProfile.bio ?? '');
      setRoles(workerProfile.roles ?? []);
      setCerts(workerProfile.certifications ?? []);
      setExperienceYears(String(workerProfile.yearsExperience ?? ''));
    } else if (currentUser) {
      setName(currentUser.name ?? '');
      setCity(currentUser.city ?? '');
    }
  }, [workerProfile, currentUser]);

  const toggleRole = (r: string) => setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  const toggleCert = (c: string) => setCerts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const payload = {
        name,
        city,
        bio,
        roles,
        certifications: certs,
        yearsExperience: experienceYears ? Number(experienceYears) : undefined,
      };
      console.log('[EditProfile] Saving profile:', payload);
      await apiPut(`/api/worker-profiles/me?user_id=${currentUser.id}`, payload);
      await refreshWorkerProfile();
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[EditProfile] Error saving profile:', err);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveButtonLabel = loading ? 'Saving...' : 'Save Profile';

  return (
    <>
      <Stack.Screen options={{
        title: 'Edit Profile',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        headerLeft: () => (
          <AnimatedPressable onPress={() => { console.log('[EditProfile] Back button pressed'); router.back(); }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <MaterialIcons name="chevron-left" size={24} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        ),
      }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <View style={{ ...glass, marginBottom: 16 }}>
          <SectionHeader icon="person" title="Basic Info" />
          <InputField
            label="Full Name"
            value={name}
            onChangeText={(t) => { console.log('[EditProfile] Name changed'); setName(t); }}
            placeholder="Your full name"
          />
          <InputField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Chicago, IL"
          />
          <InputField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell managers about yourself..."
            multiline
          />
        </View>

        {/* Roles */}
        <View style={{ ...glass, marginBottom: 16 }}>
          <SectionHeader icon="work" title="Roles" />
          <ChipSelector options={ROLES} selected={roles} onToggle={toggleRole} />
        </View>

        {/* Certifications */}
        <View style={{ ...glass, marginBottom: 16 }}>
          <SectionHeader icon="verified" title="Certifications" />
          <ChipSelector options={CERT_OPTIONS} selected={certs} onToggle={toggleCert} />
        </View>

        {/* Experience */}
        <View style={{ ...glass, marginBottom: 32 }}>
          <SectionHeader icon="star" title="Experience" />
          <InputField
            label="Years of Experience"
            value={experienceYears}
            onChangeText={setExperienceYears}
            placeholder="e.g. 3"
            keyboardType="numeric"
          />
        </View>

        {/* Save button */}
        <AnimatedPressable onPress={() => { console.log('[EditProfile] Save button pressed'); handleSave(); }} disabled={loading}>
          <View style={{
            backgroundColor: loading ? 'rgba(0,255,135,0.5)' : COLORS.primary,
            borderRadius: 16,
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            ...primaryGlow,
          }}>
            <MaterialIcons name="check" size={22} color="#000" />
            <Text style={{ color: '#000', fontSize: 17, fontFamily: 'SpaceGrotesk-Bold' }}>
              {saveButtonLabel}
            </Text>
          </View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
