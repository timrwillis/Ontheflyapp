import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Switch, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiGet, apiPut } from '@/utils/api';
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
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  label: string;
}) {
  const [focused, setFocused] = useState(false);
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

export default function EditProfileScreen() {
  const router = useRouter();
  const { currentUser, workerProfile, currentRole, refreshWorkerProfile } = useRole();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [hasTransportation, setHasTransportation] = useState(false);
  const [radius, setRadius] = useState('10');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        console.log('[EditProfile] Loading profile from /api/me...');
        const data = await apiGet<Record<string, unknown>>('/api/me');
        console.log('[EditProfile] Profile loaded:', data);
        setName(String(data.name ?? ''));
        setPhone(String(data.phone ?? ''));
        if (currentRole === 'worker') {
          const wp = data.worker_profile as Record<string, unknown> | undefined;
          setCity(String(wp?.city ?? ''));
          setBio(String(wp?.bio ?? ''));
          setHasTransportation(Boolean(wp?.has_transportation));
          setRadius(String(wp?.preferred_radius_miles ?? '10'));
        }
      } catch (err) {
        console.error('[EditProfile] Error loading profile:', err);
        // Fall back to context data
        setName(currentUser?.name ?? '');
        setPhone(currentUser?.phone ?? '');
        if (workerProfile) {
          setCity(workerProfile.city ?? '');
          setBio(workerProfile.bio ?? '');
          setHasTransportation(workerProfile.has_transportation ?? false);
          setRadius(String(workerProfile.preferred_radius_miles ?? 10));
        }
      } finally {
        setDataLoading(false);
      }
    };
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    console.log('[EditProfile] Save button pressed');
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
    setLoading(true);
    try {
      // Update base user
      const userPayload: Record<string, unknown> = { name: name.trim(), phone: phone.trim() || undefined };
      console.log('[EditProfile] Saving user profile:', userPayload);
      await apiPut('/api/me', userPayload);

      // Update role-specific profile
      if (currentRole === 'worker') {
        const workerPayload = {
          city: city.trim() || undefined,
          bio: bio.trim() || undefined,
          has_transportation: hasTransportation,
          preferred_radius_miles: Number(radius) || 10,
        };
        console.log('[EditProfile] Saving worker profile:', workerPayload);
        await apiPut('/api/me/worker-profile', workerPayload);
        await refreshWorkerProfile();
      } else if (currentRole === 'manager') {
        const managerPayload = { phone: phone.trim() || undefined };
        console.log('[EditProfile] Saving manager profile:', managerPayload);
        await apiPut('/api/me/manager-profile', managerPayload);
      }

      console.log('[EditProfile] Profile saved successfully');
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

  if (dataLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk-Regular' }}>Loading...</Text>
      </View>
    );
  }

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
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
          />
        </View>

        {/* Worker-specific fields */}
        {currentRole === 'worker' && (
          <>
            <View style={{ ...glass, marginBottom: 16 }}>
              <SectionHeader icon="place" title="Location" />
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
                onValueChange={(v) => { console.log('[EditProfile] Transportation toggled:', v); setHasTransportation(v); }}
                trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primaryMuted }}
                thumbColor={hasTransportation ? COLORS.primary : COLORS.textSecondary}
              />
            </View>

            <View style={{ ...glass, marginBottom: 32 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
                PREFERRED RADIUS (MILES)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {['5', '10', '15', '25', '50'].map((r) => {
                  const isActive = radius === r;
                  return (
                    <AnimatedPressable key={r} onPress={() => { console.log('[EditProfile] Radius selected:', r); setRadius(r); }}>
                      <View style={{
                        backgroundColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        paddingHorizontal: 18,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.1)',
                      }}>
                        <Text style={{ color: isActive ? '#000' : COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                          {r}
                          {' mi'}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {currentRole === 'manager' && (
          <View style={{ height: 16 }} />
        )}

        {/* Save button */}
        <AnimatedPressable onPress={handleSave} disabled={loading}>
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
              {loading ? 'Saving...' : 'Save Profile'}
            </Text>
          </View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
