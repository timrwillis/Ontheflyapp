import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { authenticatedGet, authenticatedPatch } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// ─── Types ───────────────────────────────────────────────────────────────────

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = typeof DAYS[number];

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

interface TimeWindow {
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM" 24h — end < start means crosses midnight
}

type AvailabilityTemplate = Record<DayKey, TimeWindow[]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseHHMM(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDisplayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function emptyTemplate(): AvailabilityTemplate {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={{
      position: 'absolute',
      bottom: 120,
      left: 24,
      right: 24,
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      zIndex: 1000,
      ...Platform.select({
        web: { boxShadow: '0 4px 24px rgba(0,255,135,0.4)' },
        default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
      }),
    }}>
      <MaterialIcons name="check-circle" size={20} color="#000" />
      <Text style={{ color: '#000', fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>{message}</Text>
    </View>
  );
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────

interface TimePickerModalProps {
  visible: boolean;
  initial: Date;
  label: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

function TimePickerModal({ visible, initial, label, onConfirm, onCancel }: TimePickerModalProps) {
  const [picked, setPicked] = useState(initial);

  useEffect(() => { setPicked(initial); }, [initial]);

  if (Platform.OS === 'android') {
    // Android: show inline DateTimePicker, no modal wrapping needed
    if (!visible) return null;
    return (
      <DateTimePicker
        value={picked}
        mode="time"
        display="default"
        onChange={(_e, d) => { if (d) onConfirm(d); else onCancel(); }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 16,
              paddingBottom: 40,
              paddingHorizontal: 24,
            }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 16, textAlign: 'center' }}>
                {label}
              </Text>
              <DateTimePicker
                value={picked}
                mode="time"
                display="spinner"
                textColor={COLORS.text}
                themeVariant="dark"
                onChange={(_e, d) => { if (d) setPicked(d); }}
                style={{ alignSelf: 'center' }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <AnimatedPressable onPress={onCancel} style={{ flex: 1 }}>
                  <View style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold' }}>Cancel</Text>
                  </View>
                </AnimatedPressable>
                <AnimatedPressable onPress={() => onConfirm(picked)} style={{ flex: 1 }}>
                  <View style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#000', fontSize: 15, fontFamily: 'SpaceGrotesk-Bold' }}>Set Time</Text>
                  </View>
                </AnimatedPressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AvailabilityTemplateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [template, setTemplate] = useState<AvailabilityTemplate>(emptyTemplate());
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // Time picker state
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    day: DayKey;
    field: 'start' | 'end';
    windowIdx: number | null; // null = new window
    value: Date;
    pendingStart?: string;
  }>({ visible: false, day: 'mon', field: 'start', windowIdx: null, value: new Date() });

  // Load current template
  useEffect(() => {
    const load = async () => {
      try {
        const data = await authenticatedGet<{ availabilityTemplate?: Record<string, TimeWindow[]>; availability_template?: Record<string, TimeWindow[]> }>('/api/worker-profiles/me');
        const tmpl = data?.availabilityTemplate ?? data?.availability_template;
        if (tmpl) {
          const t = emptyTemplate();
          for (const day of DAYS) {
            t[day] = (tmpl[day] ?? []).filter(
              (w) => typeof w.start === 'string' && typeof w.end === 'string'
            );
          }
          setTemplate(t);
        }
      } catch {
        // No template yet — show empty
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const showToast = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authenticatedPatch('/api/worker/availability-template', { template });
      showToast();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Remove a window from a day
  const removeWindow = (day: DayKey, idx: number) => {
    setTemplate((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }));
  };

  // Open picker to add a new window — starts with picking start time
  const openAddWindow = (day: DayKey) => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    setPickerState({ visible: true, day, field: 'start', windowIdx: null, value: d });
  };

  const handlePickerConfirm = (date: Date) => {
    const { day, field, pendingStart } = pickerState;
    const hhmm = toHHMM(date);

    if (field === 'start') {
      // Got start — now pick end
      const endDefault = new Date(date);
      endDefault.setHours(endDefault.getHours() + 4);
      setPickerState({ visible: true, day, field: 'end', windowIdx: null, value: endDefault, pendingStart: hhmm });
    } else {
      // Got end — finalize window
      const window: TimeWindow = { start: pendingStart!, end: hhmm };
      setTemplate((prev) => ({
        ...prev,
        [day]: [...prev[day], window],
      }));
      setPickerState((p) => ({ ...p, visible: false }));
    }
  };

  const handlePickerCancel = () => {
    setPickerState((p) => ({ ...p, visible: false }));
  };

  const totalWindows = DAYS.reduce((sum, d) => sum + template[d].length, 0);

  if (loadingData) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Availability Schedule', headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.text, headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' } }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{
        title: 'Availability Schedule',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        headerLeft: () => (
          <AnimatedPressable onPress={() => router.back()}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
              <MaterialIcons name="chevron-left" size={24} color={COLORS.text} />
            </View>
          </AnimatedPressable>
        ),
      }} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={{ color: COLORS.text, fontSize: 24, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 }}>
          Weekly Schedule
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 20, marginBottom: 24 }}>
          {totalWindows === 0
            ? 'Set when you typically work so we can ping you for rush shifts.'
            : `${totalWindows} time window${totalWindows === 1 ? '' : 's'} set across the week.`}
        </Text>

        {/* Day rows */}
        {DAYS.map((day) => {
          const windows = template[day];
          return (
            <View
              key={day}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: windows.length > 0 ? 'rgba(0,255,135,0.2)' : COLORS.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Day header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: windows.length > 0 ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: windows.length > 0 ? COLORS.primary : COLORS.textTertiary,
                  }} />
                  <Text style={{
                    color: windows.length > 0 ? COLORS.text : COLORS.textSecondary,
                    fontSize: 15,
                    fontFamily: 'SpaceGrotesk-SemiBold',
                  }}>
                    {DAY_LABELS[day]}
                  </Text>
                  {windows.length === 0 && (
                    <Text style={{ color: COLORS.textTertiary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                      Off
                    </Text>
                  )}
                </View>
                <AnimatedPressable onPress={() => openAddWindow(day)}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}>
                    <MaterialIcons name="add" size={14} color={COLORS.primary} />
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold' }}>Add</Text>
                  </View>
                </AnimatedPressable>
              </View>

              {/* Time window pills */}
              {windows.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {windows.map((w, idx) => {
                    const crossesMidnight = w.end <= w.start;
                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: 'rgba(0,255,135,0.08)',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(0,255,135,0.25)',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                        }}
                      >
                        <Text style={{ color: COLORS.primary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                          {formatDisplayTime(w.start)} – {formatDisplayTime(w.end)}
                          {crossesMidnight ? ' +1' : ''}
                        </Text>
                        <Pressable
                          onPress={() => removeWindow(day, idx)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <MaterialIcons name="close" size={14} color={COLORS.primary} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Save button */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 24,
        paddingTop: 16,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
      }}>
        <AnimatedPressable onPress={handleSave} disabled={saving}>
          <View style={{
            backgroundColor: saving ? COLORS.primaryMuted : COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            ...Platform.select({
              web: { boxShadow: '0 0 24px rgba(0,255,135,0.35)' },
              default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
            }),
          }}>
            {saving
              ? <ActivityIndicator color="#000" size="small" />
              : <MaterialIcons name="check" size={20} color="#000" />}
            <Text style={{ color: '#000', fontSize: 17, fontFamily: 'SpaceGrotesk-Bold' }}>
              {saving ? 'Saving...' : 'Save Schedule'}
            </Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Time picker modal */}
      <TimePickerModal
        visible={pickerState.visible}
        initial={pickerState.value}
        label={pickerState.field === 'start' ? 'Set start time' : 'Set end time'}
        onConfirm={handlePickerConfirm}
        onCancel={handlePickerCancel}
      />

      {/* Toast */}
      <Toast message="✅ Availability saved" visible={toastVisible} />
    </View>
  );
}
