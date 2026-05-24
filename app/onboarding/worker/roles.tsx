import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authenticatedPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const ALL_ROLES = [
  { value: 'bartender',   label: 'Bartender',    emoji: '🍸' },
  { value: 'server',      label: 'Server',        emoji: '🍽️' },
  { value: 'cook',        label: 'Cook',          emoji: '👨‍🍳' },
  { value: 'busser',      label: 'Busser',        emoji: '🥗' },
  { value: 'barback',     label: 'Barback',       emoji: '🍹' },
  { value: 'event_staff', label: 'Event Staff',   emoji: '🎪' },
  { value: 'security',    label: 'Security',      emoji: '🔒' },
  { value: 'host',        label: 'Host/Hostess',  emoji: '🏨' },
  { value: 'runner',      label: 'Runner',        emoji: '🚀' },
  { value: 'line_cook',   label: 'Line Cook',     emoji: '🍳' },
  { value: 'dishwasher',  label: 'Dishwasher',    emoji: '🧹' },
  { value: 'catering',    label: 'Catering',      emoji: '🎭' },
];

interface SelectedRole {
  role: string;
  yearsExperience: number;
  isPrimary: boolean;
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
      return [...prev, { role: roleValue, yearsExperience: 1, isPrimary }];
    });
  };

  const setYears = (roleValue: string, years: number) => {
    setSelectedRoles((prev) =>
      prev.map((r) => (r.role === roleValue ? { ...r, yearsExperience: years } : r))
    );
  };

  const setPrimary = (roleValue: string) => {
    setSelectedRoles((prev) =>
      prev.map((r) => ({ ...r, isPrimary: r.role === roleValue }))
    );
  };

  const handleNext = async () => {
    if (selectedRoles.length === 0) {
      Alert.alert('Required', 'Please select at least one role.');
      return;
    }
    setLoading(true);
    try {
      await authenticatedPost('/api/onboarding/worker/roles', { roles: selectedRoles });
      router.push('/onboarding/worker/availability');
    } catch (err) {
      console.error('[WorkerOnboarding] Roles save failed:', err);
      Alert.alert('Error', 'Could not save your roles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selectedRoles.length > 0 && !loading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0A0A0A' }}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingHorizontal: 24,
        paddingBottom: 60,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress bar */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= 1 ? '#00FF87' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </View>

      <Text
        style={{
          color: '#F0F0F0',
          fontSize: 28,
          fontFamily: 'SpaceGrotesk-Bold',
          marginBottom: 8,
        }}
      >
        What do you do?
      </Text>
      <Text
        style={{
          color: '#8A8A8A',
          fontSize: 15,
          fontFamily: 'SpaceGrotesk-Regular',
          marginBottom: 32,
        }}
      >
        Select all roles you can work
      </Text>

      {/* Role grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {ALL_ROLES.map((r) => {
          const isSelected = Boolean(selectedRoles.find((s) => s.role === r.value));
          return (
            <AnimatedPressable
              key={r.value}
              onPress={() => toggleRole(r.value)}
              style={{ width: '48%' }}
            >
              <View
                style={{
                  backgroundColor: isSelected ? 'rgba(0,255,135,0.06)' : '#141414',
                  borderRadius: 16,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? '#00FF87' : 'rgba(255,255,255,0.08)',
                  height: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  position: 'relative',
                }}
              >
                {isSelected && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#00FF87',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="check" size={13} color="#000" />
                  </View>
                )}
                <Text style={{ fontSize: 32 }}>{r.emoji}</Text>
                <Text
                  style={{
                    color: '#F0F0F0',
                    fontSize: 14,
                    fontFamily: 'SpaceGrotesk-SemiBold',
                    textAlign: 'center',
                    paddingHorizontal: 8,
                  }}
                >
                  {r.label}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      {/* Selected count */}
      <Text
        style={{
          color: '#00FF87',
          fontSize: 14,
          fontFamily: 'SpaceGrotesk-SemiBold',
          textAlign: 'center',
          marginBottom: 16,
          minHeight: 20,
        }}
      >
        {selectedRoles.length > 0
          ? `${selectedRoles.length} role${selectedRoles.length === 1 ? '' : 's'} selected`
          : ''}
      </Text>

      {/* Continue button */}
      <AnimatedPressable onPress={handleNext} disabled={!canContinue}>
        <View
          style={{
            backgroundColor: canContinue ? '#00FF87' : 'rgba(255,255,255,0.1)',
            borderRadius: 14,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: canContinue ? '#000' : 'rgba(255,255,255,0.3)',
              fontSize: 17,
              fontFamily: 'SpaceGrotesk-Bold',
            }}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
