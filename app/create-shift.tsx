import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Pressable, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Zap, Plus, Minus } from 'lucide-react-native';

const ROLES = ['Bartender', 'Server', 'Cook', 'Dishwasher', 'Host', 'Event Staff'];
const URGENCY_OPTIONS = ['Tonight', 'Tomorrow', 'This Week', 'Future'];
const CERT_OPTIONS = ['TIPS', 'ServSafe', 'Food Handler', 'Alcohol Awareness'];

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 0.5 }}>
        {text.toUpperCase()}
      </Text>
      {required && <Text style={{ color: COLORS.danger, marginLeft: 4, fontSize: 12 }}>*</Text>}
    </View>
  );
}

function InputField({ value, onChangeText, placeholder, keyboardType, multiline }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textTertiary}
      keyboardType={keyboardType ?? 'default'}
      multiline={multiline}
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

function ChipSelector({ options, selected, onToggle, single }: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const isActive = selected.includes(opt);
        return (
          <AnimatedPressable key={opt} onPress={() => { console.log('[CreateShift] Chip toggled:', opt); onToggle(opt); }}>
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

export default function CreateShiftScreen() {
  const router = useRouter();
  const { currentUser } = useRole();

  const [role, setRole] = useState<string[]>([]);
  const [workersNeeded, setWorkersNeeded] = useState(1);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hourlyPay, setHourlyPay] = useState('');
  const [location, setLocation] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [experience, setExperience] = useState('');
  const [certs, setCerts] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<string[]>(['Tonight']);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleRole = (r: string) => setRole([r]);
  const toggleUrgency = (u: string) => setUrgency([u]);
  const toggleCert = (c: string) => setCerts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSubmit = async () => {
    if (role.length === 0) {
      Alert.alert('Missing info', 'Please select a role for this shift.');
      return;
    }
    if (!date) {
      Alert.alert('Missing info', 'Please enter a date for this shift.');
      return;
    }
    if (!hourlyPay) {
      Alert.alert('Missing info', 'Please enter the hourly pay rate.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: role[0],
        workers_needed: workersNeeded,
        date,
        start_time: startTime,
        end_time: endTime,
        hourly_pay: Number(hourlyPay),
        location,
        dress_code: dressCode,
        experience_required: experience,
        certifications_required: certs,
        urgency: urgency[0]?.toLowerCase() ?? 'tonight',
        notes,
        manager_id: currentUser?.id,
        status: 'open',
      };
      console.log('[CreateShift] Submitting shift:', payload);
      await apiPost('/api/shifts', payload);
      Alert.alert('Shift Blasted! 🚀', 'Your shift has been posted. Workers will be notified.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[CreateShift] Error creating shift:', err);
      Alert.alert('Error', 'Could not post this shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Blast a Shift' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Role */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Role Needed" required />
          <ChipSelector options={ROLES} selected={role} onToggle={toggleRole} single />
        </View>

        {/* Workers needed */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Workers Needed" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <AnimatedPressable onPress={() => { console.log('[CreateShift] Workers decreased'); setWorkersNeeded((n) => Math.max(1, n - 1)); }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={18} color={COLORS.text} />
              </View>
            </AnimatedPressable>
            <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', minWidth: 32, textAlign: 'center' }}>{workersNeeded}</Text>
            <AnimatedPressable onPress={() => { console.log('[CreateShift] Workers increased'); setWorkersNeeded((n) => Math.min(10, n + 1)); }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} color={COLORS.text} />
              </View>
            </AnimatedPressable>
          </View>
        </View>

        {/* Date */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Date" required />
          <InputField value={date} onChangeText={setDate} placeholder="e.g. 2025-01-15" />
        </View>

        {/* Times */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Label text="Start Time" />
            <InputField value={startTime} onChangeText={setStartTime} placeholder="e.g. 6:00 PM" />
          </View>
          <View style={{ flex: 1 }}>
            <Label text="End Time" />
            <InputField value={endTime} onChangeText={setEndTime} placeholder="e.g. 11:00 PM" />
          </View>
        </View>

        {/* Pay */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Hourly Pay ($)" required />
          <View style={{ position: 'relative' }}>
            <Text style={{ position: 'absolute', left: 14, top: 14, color: COLORS.primary, fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', zIndex: 1 }}>$</Text>
            <TextInput
              value={hourlyPay}
              onChangeText={(t) => { console.log('[CreateShift] Pay changed:', t); setHourlyPay(t); }}
              placeholder="25"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
              style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, paddingLeft: 30, color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', height: 48 }}
            />
          </View>
        </View>

        {/* Location */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Location" />
          <InputField value={location} onChangeText={setLocation} placeholder="e.g. 123 Main St, Chicago" />
        </View>

        {/* Dress code */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Dress Code" />
          <InputField value={dressCode} onChangeText={setDressCode} placeholder="e.g. All black, non-slip shoes" />
        </View>

        {/* Experience */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Experience Required" />
          <InputField value={experience} onChangeText={setExperience} placeholder="e.g. 2+ years bartending" />
        </View>

        {/* Certifications */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Certifications Required" />
          <ChipSelector options={CERT_OPTIONS} selected={certs} onToggle={toggleCert} />
        </View>

        {/* Urgency */}
        <View style={{ marginBottom: 20 }}>
          <Label text="Urgency" />
          <ChipSelector options={URGENCY_OPTIONS} selected={urgency} onToggle={toggleUrgency} single />
        </View>

        {/* Notes */}
        <View style={{ marginBottom: 32 }}>
          <Label text="Notes" />
          <InputField value={notes} onChangeText={setNotes} placeholder="Any additional details for workers..." multiline />
        </View>

        {/* Submit */}
        <AnimatedPressable onPress={() => { console.log('[CreateShift] Blast shift button pressed'); handleSubmit(); }} disabled={loading}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.6 : 1, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0, 255, 135, 0.3)' } : { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 }) }}>
            <Zap size={20} color="#000" fill="#000" />
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {loading ? 'Blasting...' : 'Blast Shift 🚀'}
            </Text>
          </View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
