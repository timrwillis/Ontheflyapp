import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
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

const ALL_ROLES = [
  { value: 'bartender', label: 'Bartender', icon: 'local-bar' as const },
  { value: 'server', label: 'Server', icon: 'room-service' as const },
  { value: 'cook', label: 'Cook', icon: 'outdoor-grill' as const },
  { value: 'dishwasher', label: 'Dishwasher', icon: 'water-drop' as const },
  { value: 'event_staff', label: 'Event Staff', icon: 'celebration' as const },
  { value: 'security', label: 'Security', icon: 'security' as const },
  { value: 'barback', label: 'Barback', icon: 'sports-bar' as const },
  { value: 'host', label: 'Host', icon: 'person' as const },
  { value: 'runner', label: 'Runner', icon: 'directions-run' as const },
  { value: 'busser', label: 'Busser', icon: 'cleaning-services' as const },
];

interface SelectedRole {
  role: string;
  years_experience: number;
  is_primary: boolean;
}

export default function WorkerRolesStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedRoles, setSelectedRoles] = useState<SelectedRole[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleRole = (roleValue: string) => {
    setSelectedRoles((prev) => {
      const exists = prev.find((r) => r.role === roleValue);
      if (exists) {
        return prev.filter((r) => r.role !== roleValue);
      }
      const isPrimary = prev.length === 0;
      return [...prev, { role: roleValue, years_experience: 1, is_primary: isPrimary }];
    });
  };

  const setYears = (roleValue: string, years: number) => {
    setSelectedRoles((prev) => prev.map((r) => r.role === roleValue ? { ...r, years_experience: years } : r));
  };

  const setPrimary = (roleValue: string) => {
    setSelectedRoles((prev) => prev.map((r) => ({ ...r, is_primary: r.role === roleValue })));
  };

  const handleNext = async () => {
    if (selectedRoles.length === 0) {
      Alert.alert('Required', 'Please select at least one role.');
      return;
    }
    setLoading(true);
    try {
      const payload = { roles: selectedRoles };
      await apiPost('/api/onboarding/worker/roles', payload);
      router.push('/onboarding/worker/availability');
    } catch (err) {
      console.error('[WorkerOnboarding] Roles save failed:', err);
      Alert.alert('Error', 'Could not save your roles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= 1 ? COLORS.primary : 'rgba(255,255,255,0.1)' }} />
        ))}
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 6 }}>
        STEP 2 OF 4
      </Text>
      <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, marginBottom: 6 }}>
        Your Roles
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 28, lineHeight: 22 }}>
        Select all roles you can fill. Tap a selected role to set experience and mark as primary.
      </Text>

      {/* Role grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {ALL_ROLES.map((r) => {
          const selected = selectedRoles.find((s) => s.role === r.value);
          const isSelected = Boolean(selected);
          const isPrimary = selected?.is_primary ?? false;
          return (
            <AnimatedPressable
              key={r.value}
              onPress={() => toggleRole(r.value)}
              style={{ width: '47%' }}
            >
              <View style={{
                backgroundColor: isSelected ? (isPrimary ? COLORS.primary : COLORS.primaryMuted) : 'rgba(255,255,255,0.04)',
                borderRadius: 14,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? COLORS.primary : 'rgba(255,255,255,0.1)',
                padding: 14,
                alignItems: 'center',
                gap: 6,
                ...(isSelected && isPrimary ? primaryGlow : {}),
              }}>
                <MaterialIcons name={r.icon} size={26} color={isSelected ? (isPrimary ? '#000' : COLORS.primary) : COLORS.textSecondary} />
                <Text style={{ color: isSelected ? (isPrimary ? '#000' : COLORS.primary) : COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold', textAlign: 'center' }}>
                  {r.label}
                </Text>
                {isPrimary && (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: '#000', fontSize: 9, fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 1 }}>PRIMARY</Text>
                  </View>
                )}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Selected roles — experience steppers */}
      {selectedRoles.length > 0 && (
        <View style={{ ...glass, marginBottom: 24 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
            YEARS OF EXPERIENCE
          </Text>
          {selectedRoles.map((sr) => {
            const roleInfo = ALL_ROLES.find((r) => r.value === sr.role);
            return (
              <View key={sr.role} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>
                  {roleInfo?.label ?? sr.role}
                </Text>
                <AnimatedPressable onPress={() => setYears(sr.role, Math.max(0, sr.years_experience - 1))}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="remove" size={16} color={COLORS.primary} />
                  </View>
                </AnimatedPressable>
                <Text style={{ color: COLORS.primary, fontSize: 16, fontFamily: 'SpaceGrotesk-Bold', minWidth: 24, textAlign: 'center' }}>
                  {sr.years_experience}
                </Text>
                <AnimatedPressable onPress={() => setYears(sr.role, Math.min(30, sr.years_experience + 1))}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="add" size={16} color={COLORS.primary} />
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={() => setPrimary(sr.role)}>
                  <View style={{
                    backgroundColor: sr.is_primary ? COLORS.primaryMuted : 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: sr.is_primary ? COLORS.primary : 'rgba(255,255,255,0.1)',
                  }}>
                    <Text style={{ color: sr.is_primary ? COLORS.primary : COLORS.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                      {sr.is_primary ? '★ Primary' : 'Set Primary'}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      )}

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
