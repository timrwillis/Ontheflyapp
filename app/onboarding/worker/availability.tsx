import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { apiPatch } from '@/utils/api';
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

const DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export default function WorkerAvailabilityStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('11:00 PM');
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: string) => {
    console.log('[WorkerOnboarding] Day toggled:', day);
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleNext = async () => {
    console.log('[WorkerOnboarding] Availability step submit pressed');
    if (selectedDays.length === 0) {
      Alert.alert('Required', 'Please select at least one available day.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        availability_days: selectedDays,
        availability_start: startTime,
        availability_end: endTime,
        is_available: isAvailable,
        onboarding_step: 3,
      };
      console.log('[WorkerOnboarding] Submitting availability:', payload);
      await apiPatch('/api/worker-profiles/me', payload);
      console.log('[WorkerOnboarding] Availability saved, navigating to complete');
      router.push('/onboarding/worker/complete');
    } catch (err) {
      console.error('[WorkerOnboarding] Error saving availability:', err);
      Alert.alert('Error', 'Could not save your availability. Please try again.');
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
          <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= 2 ? COLORS.primary : 'rgba(255,255,255,0.1)' }} />
        ))}
      </View>

      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 6 }}>
        STEP 3 OF 4
      </Text>
      <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5, marginBottom: 6 }}>
        Availability
      </Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 28, lineHeight: 22 }}>
        When are you available to work? Managers will see this when posting shifts.
      </Text>

      {/* Days */}
      <View style={{ ...glass, marginBottom: 16 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
          AVAILABLE DAYS
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {DAYS.map((d) => {
            const isActive = selectedDays.includes(d.value);
            return (
              <AnimatedPressable key={d.value} onPress={() => toggleDay(d.value)}>
                <View style={{
                  backgroundColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.1)',
                  minWidth: 48,
                  alignItems: 'center',
                }}>
                  <Text style={{ color: isActive ? '#000' : COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {d.label}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <AnimatedPressable onPress={() => { console.log('[WorkerOnboarding] Select all days'); setSelectedDays(DAYS.map((d) => d.value)); }} style={{ flex: 1 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>Select All</Text>
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => { console.log('[WorkerOnboarding] Clear days'); setSelectedDays([]); }} style={{ flex: 1 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>Clear</Text>
            </View>
          </AnimatedPressable>
        </View>
      </View>

      {/* Time range */}
      <View style={{ ...glass, marginBottom: 16 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 14 }}>
          AVAILABLE HOURS
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 8 }}>FROM</Text>
            <TextInput
              value={startTime}
              onChangeText={(t) => { console.log('[WorkerOnboarding] Start time changed:', t); setStartTime(t); }}
              placeholder="9:00 AM"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                padding: 12,
                color: COLORS.text,
                fontSize: 15,
                fontFamily: 'SpaceGrotesk-Regular',
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 8 }}>TO</Text>
            <TextInput
              value={endTime}
              onChangeText={(t) => { console.log('[WorkerOnboarding] End time changed:', t); setEndTime(t); }}
              placeholder="11:00 PM"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                padding: 12,
                color: COLORS.text,
                fontSize: 15,
                fontFamily: 'SpaceGrotesk-Regular',
              }}
            />
          </View>
        </View>
      </View>

      {/* Available now toggle */}
      <View style={{ ...glass, marginBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 2 }}>
            Available right now
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
            Show up as available for immediate shifts
          </Text>
        </View>
        <Switch
          value={isAvailable}
          onValueChange={(v) => { console.log('[WorkerOnboarding] Available now toggled:', v); setIsAvailable(v); }}
          trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primaryMuted }}
          thumbColor={isAvailable ? COLORS.primary : COLORS.textSecondary}
        />
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
