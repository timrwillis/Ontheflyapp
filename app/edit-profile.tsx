import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiPut } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Save } from 'lucide-react-native';

const ROLES = ['Bartender', 'Server', 'Cook', 'Dishwasher', 'Host', 'Event Staff'];
const CERT_OPTIONS = ['TIPS', 'ServSafe', 'Food Handler', 'Alcohol Awareness'];

function Label({ text }: { text: string }) {
  return (
    <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.5, marginBottom: 6 }}>
      {text.toUpperCase()}
    </Text>
  );
}

function InputField({ value, onChangeText, placeholder, multiline, keyboardType }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textTertiary}
      multiline={multiline}
      keyboardType={keyboardType ?? 'default'}
      style={{
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        color: COLORS.text,
        fontSize: 15,
        fontFamily: 'SpaceGrotesk-Regular',
        minHeight: multiline ? 80 : 48,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
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
            <View style={{ backgroundColor: isActive ? COLORS.primary : COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: isActive ? COLORS.primary : COLORS.border }}>
              <Text style={{ color: isActive ? '#000' : COLORS.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
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

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Full Name" />
          <InputField value={name} onChangeText={(t) => { console.log('[EditProfile] Name changed'); setName(t); }} placeholder="Your full name" />
        </View>

        {/* City */}
        <View style={{ marginBottom: 20 }}>
          <Label text="City" />
          <InputField value={city} onChangeText={setCity} placeholder="e.g. Chicago, IL" />
        </View>

        {/* Bio */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Bio" />
          <InputField value={bio} onChangeText={setBio} placeholder="Tell managers about yourself..." multiline />
        </View>

        {/* Roles */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Roles" />
          <ChipSelector options={ROLES} selected={roles} onToggle={toggleRole} />
        </View>

        {/* Certifications */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Certifications" />
          <ChipSelector options={CERT_OPTIONS} selected={certs} onToggle={toggleCert} />
        </View>

        {/* Experience */}
        <View style={{ marginBottom: 32 }}>
          <Label text="Years of Experience" />
          <InputField value={experienceYears} onChangeText={setExperienceYears} placeholder="e.g. 3" keyboardType="numeric" />
        </View>

        {/* Save button */}
        <AnimatedPressable onPress={() => { console.log('[EditProfile] Save button pressed'); handleSave(); }} disabled={loading}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.6 : 1 }}>
            <Save size={20} color="#000" />
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
