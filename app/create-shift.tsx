import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { ROLES } from '@/constants/Roles';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiPost, apiGet, authenticatedPost, authenticatedGet } from '@/utils/api';
import { parseMoneyInput, isValidHourlyRate } from '@/utils/money';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Layout constants ────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Role icon renderer ───────────────────────────────────────────────────────

function RoleIcon({ lib, icon, color }: { lib: string; icon: string; color: string }) {
  if (lib === 'ionicons') return <Ionicons name={icon as any} size={24} color={color} />;
  if (lib === 'feather') return <Feather name={icon as any} size={24} color={color} />;
  return <MaterialCommunityIcons name={icon as any} size={24} color={color} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isToday(ymd: string): boolean {
  return ymd === todayYMD();
}

function addFiveHours(hhMM: string): string {
  const [h, m] = hhMM.split(':').map(Number);
  const totalMins = h * 60 + m + 5 * 60;
  return `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
}

function formatDateDisplay(ymd: string): string {
  // Use T12:00:00 to avoid timezone day-shift
  const d = new Date(ymd + 'T12:00:00');
  if (isToday(ymd)) {
    return `Today, ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
  }
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTimeDisplay(hhMM: string): string {
  if (!hhMM || !/^\d{2}:\d{2}$/.test(hhMM)) return hhMM;
  const [h, m] = hhMM.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function chipIsPast(chipValue: string, selectedDate: string): boolean {
  if (!isToday(selectedDate)) return false;
  if (chipValue === 'Now' || chipValue === 'In 1 hr') return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (chipValue === 'Tonight 6PM') return nowMins >= 18 * 60;
  if (chipValue === 'Tonight 8PM') return nowMins >= 20 * 60;
  if (chipValue === 'Tonight 9PM') return nowMins >= 21 * 60;
  return false;
}

function dateToHHMM(date: Date): string {
  return toHHMM(date);
}

// ─── Data ────────────────────────────────────────────────────────────────────

const URGENCY_OPTIONS: { label: string; icon: string; sublabel: string; value: string }[] = [
  { label: 'ASAP',          icon: 'warning',     sublabel: 'Right now',      value: 'emergency' },
  { label: 'Tonight',       icon: 'nightlight',  sublabel: 'This evening',   value: 'tonight' },
  { label: 'Rush Coverage', icon: 'bolt',        sublabel: 'Emergency fill', value: 'high' },
  { label: 'Weekend Rush',  icon: 'weekend',     sublabel: 'Fri–Sun',        value: 'this_week' },
  { label: 'Future Shift',  icon: 'event',       sublabel: 'Plan ahead',     value: 'tomorrow' },
];

const URGENCY_COLORS: Record<string, string> = {
  emergency: '#FF3B30',
  tonight: '#FF9500',
  high: '#FF6B35',
  this_week: '#AF52DE',
  tomorrow: '#00FF87',
};

const PAY_PRESETS = [
  { label: '<$20', value: '19' },
  { label: '$22',  value: '22' },
  { label: '$28',  value: '28' },
  { label: '$32',  value: '32' },
  { label: '$38',  value: '38' },
  { label: '$45',  value: '45' },
  { label: '$55',  value: '55' },
  { label: 'Custom', value: 'custom' },
];

const RUSH_CHIPS: { label: string; value: string }[] = [
  { label: '🔴 Now',         value: 'Now' },
  { label: '⏱ +1 hr',       value: 'In 1 hr' },
  { label: '🌆 Tonight 6PM', value: 'Tonight 6PM' },
  { label: '🌇 Tonight 8PM', value: 'Tonight 8PM' },
  { label: '🌙 Tonight 9PM', value: 'Tonight 9PM' },
];

const CERT_OPTIONS = ['TIPS', 'ServSafe', 'Food Handler', 'Alcohol Awareness'];

const CALENDAR_THEME = {
  backgroundColor: COLORS.background,
  calendarBackground: COLORS.background,
  textSectionTitleColor: COLORS.textSecondary,
  selectedDayBackgroundColor: COLORS.primary,
  selectedDayTextColor: '#000000',
  todayTextColor: COLORS.primary,
  dayTextColor: COLORS.text,
  textDisabledColor: 'rgba(255,255,255,0.2)',
  dotColor: COLORS.primary,
  monthTextColor: COLORS.text,
  textMonthFontFamily: 'SpaceGrotesk-Bold',
  textDayFontFamily: 'SpaceGrotesk-Regular',
  textDayHeaderFontFamily: 'SpaceGrotesk-SemiBold',
  arrowColor: COLORS.primary,
  indicatorColor: COLORS.primary,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <View style={{ width: 2, height: 12, backgroundColor: COLORS.primary, borderRadius: 2 }} />
      <Text style={styles.sectionLabel}>{text}</Text>
    </View>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressContainer}>
      {[0, 1, 2, 3].map((i) => {
        const isActive = i < step;
        return (
          <View
            key={i}
            style={[
              styles.progressSegment,
              {
                backgroundColor: isActive ? COLORS.primary : COLORS.surfaceSecondary,
                ...(isActive
                  ? (Platform.OS === 'web'
                      ? { boxShadow: '0 0 4px rgba(0,255,135,0.8)' }
                      : { shadowColor: COLORS.primary, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 })
                  : {}),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function PromiseBanner() {
  return (
    <View style={styles.promiseBanner}>
      <Text style={styles.promiseBannerText}>⚡ Post in under 15 seconds — only 4 fields required</Text>
    </View>
  );
}

// ─── Time Picker Modal ───────────────────────────────────────────────────────

function TimePickerModal({
  visible,
  label,
  value,
  onChange,
  onDismiss,
}: {
  visible: boolean;
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  onDismiss: () => void;
}) {
  const [localValue, setLocalValue] = useState<Date>(value);

  useEffect(() => {
    if (visible) setLocalValue(value);
  }, [visible]);

  if (!visible) return null;

  // Android: DateTimePicker shows as a native dialog automatically
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        mode="time"
        value={localValue}
        is24Hour={false}
        display="default"
        onChange={(_, date) => {
          if (date) onChange(date);
          else onDismiss();
        }}
      />
    );
  }

  // iOS + web: bottom-sheet modal
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.pickerOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={onDismiss}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>{label}</Text>
                <TouchableOpacity onPress={() => { onChange(localValue); onDismiss(); }}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>

              {Platform.OS !== 'web' ? (
                <DateTimePicker
                  mode="time"
                  value={localValue}
                  is24Hour={false}
                  display="spinner"
                  onChange={(_, date) => { if (date) setLocalValue(date); }}
                  themeVariant="dark"
                  style={{ height: 200 }}
                />
              ) : (
                // Web fallback: plain text input
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 12, fontSize: 13 }}>
                    Enter time (HH:MM, 24-hour)
                  </Text>
                  <TextInput
                    defaultValue={toHHMM(localValue)}
                    placeholder="e.g. 18:30"
                    placeholderTextColor={COLORS.textTertiary}
                    style={[styles.textInput, { fontSize: 28, textAlign: 'center', fontFamily: 'SpaceGrotesk-Bold' }]}
                    onChangeText={(t) => {
                      if (/^\d{2}:\d{2}$/.test(t)) {
                        const [h, m] = t.split(':').map(Number);
                        if (h < 24 && m < 60) {
                          const d = new Date();
                          d.setHours(h, m, 0, 0);
                          setLocalValue(d);
                        }
                      }
                    }}
                    autoFocus
                  />
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Paywall Screen ──────────────────────────────────────────────────────────

function PaywallScreen({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Upgrade to Post', headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.text }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <MaterialIcons name="lock" size={36} color={COLORS.primary} />
        </View>
        <Text style={{ color: COLORS.text, fontSize: 26, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 }}>
          Post Unlimited Shifts
        </Text>
        <Text style={{ color: COLORS.primary, fontSize: 22, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>
          $149/month
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 22, marginBottom: 36 }}>
          Get instant access to Kansas City's hospitality workforce. Post shifts, approve workers, and fill your floor in minutes.
        </Text>
        {[
          { icon: 'bolt', text: 'Unlimited shift posting — no caps, no limits' },
          { icon: 'people', text: 'Instant worker matching by role and availability' },
          { icon: 'notifications-active', text: 'Real-time notifications when workers apply' },
        ].map((feature) => (
          <View key={feature.text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, width: '100%', maxWidth: 320 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MaterialIcons name={feature.icon as any} size={18} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22, flex: 1, paddingTop: 7 }}>
              {feature.text}
            </Text>
          </View>
        ))}
        <View style={{ width: '100%', maxWidth: 320, height: 1, backgroundColor: COLORS.border, marginVertical: 28 }} />
        <AnimatedPressable
          onPress={onSubscribe}
          style={{ width: '100%', maxWidth: 320, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 }}
        >
          <Text style={{ color: COLORS.background, fontSize: 17, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '800', letterSpacing: 0.2 }}>
            Subscribe — $149/mo
          </Text>
        </AnimatedPressable>
        <Text style={{ color: COLORS.textTertiary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 18 }}>
          Cancel anytime. Billed monthly. No setup fees.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateShiftScreen() {
  const router = useRouter();
  const { currentUser } = useRole();
  const { isAdmin } = useAuth();

  // Required fields
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('');
  const [hourlyPay, setHourlyPay] = useState<string>('');

  // Date & time state
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [selectedTimePreset, setSelectedTimePreset] = useState<string>('');
  const [endTimeManuallySet, setEndTimeManuallySet] = useState(false);

  // Native time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');
  const [timePickerValue, setTimePickerValue] = useState<Date>(new Date());

  // Workers stepper
  const [workersNeeded, setWorkersNeeded] = useState(1);

  // Advanced fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [location, setLocation] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [experience, setExperience] = useState('');
  const [certs, setCerts] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [customPayMode, setCustomPayMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subChecking, setSubChecking] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Rush shift state
  const [isRush, setIsRush] = useState(false);
  const [rushWatchingModalVisible, setRushWatchingModalVisible] = useState(false);
  const [postedShiftId, setPostedShiftId] = useState<string | null>(null);
  const [pinnedWorkerCount, setPinnedWorkerCount] = useState(0);
  const [claimedWorkerName, setClaimedWorkerName] = useState<string | null>(null);
  const [watchingStartTime, setWatchingStartTime] = useState<string>('');

  // Pulsing glow animation
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const me = await apiGet<{ subscription_status?: string }>('/api/me');
        const active = me?.subscription_status === 'active';
        if (isAdmin) console.log('[Admin] Paywall bypassed for create-shift');
        setHasSubscription(active);
      } catch {
        setHasSubscription(true);
      } finally {
        setSubChecking(false);
      }
    };
    checkSubscription();
  }, []);

  // Advanced section collapse animation
  const advancedHeight = useRef(new Animated.Value(0)).current;
  const advancedOpacity = useRef(new Animated.Value(0)).current;

  const toggleAdvanced = useCallback(() => {
    const next = !showAdvanced;
    setShowAdvanced(next);
    Animated.parallel([
      Animated.timing(advancedHeight, { toValue: next ? 1 : 0, duration: 280, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(advancedOpacity, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }),
    ]).start();
  }, [showAdvanced, advancedHeight, advancedOpacity]);

  // Auto-detect rush using both selectedDate and startTime
  useEffect(() => {
    if (!startTime.trim() || !/^\d{2}:\d{2}$/.test(startTime) || !selectedDate) return;
    const shiftStart = new Date(`${selectedDate}T${startTime}:00`);
    const now = new Date();
    if (shiftStart.getTime() <= now.getTime()) {
      setIsRush(false);
      return;
    }
    const diffHours = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    setIsRush(diffHours <= 4);
  }, [startTime, selectedDate]);

  // Poll for claim when watching modal is open
  useEffect(() => {
    if (!rushWatchingModalVisible || !postedShiftId || claimedWorkerName) return;
    const interval = setInterval(async () => {
      try {
        const data = await authenticatedGet<{ claimed_by_worker_id?: string; claimer?: { name?: string } }>(`/api/shifts/${postedShiftId}`);
        const workerId = (data as any)?.claimed_by_worker_id;
        if (workerId) {
          const name = (data as any)?.claimer?.name ?? 'A worker';
          console.log(`[PostShift] Claimed by worker ${workerId}`);
          setClaimedWorkerName(name);
        }
      } catch { /* ignore poll errors */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [rushWatchingModalVisible, postedShiftId, claimedWorkerName]);

  // Progress: count filled required fields
  const progressStep =
    (selectedRole ? 1 : 0) +
    (selectedUrgency ? 1 : 0) +
    ((parseMoneyInput(hourlyPay) ?? 0) > 0 ? 1 : 0) +
    (startTime.trim().length > 0 ? 1 : 0);

  const toggleCert = (c: string) => {
    setCerts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  // ── Date handlers ─────────────────────────────────────────────────────────

  const handleDateSelect = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    setCalendarOpen(false);
    // Clear time selections when date changes
    setStartTime('');
    setSelectedTimePreset('');
    setEndTime('');
    setEndTimeManuallySet(false);
  };

  // ── Time handlers ─────────────────────────────────────────────────────────

  const applyStartTime = (hhMM: string) => {
    setStartTime(hhMM);
    if (!endTimeManuallySet) {
      setEndTime(addFiveHours(hhMM));
    }
  };

  const handleChipPress = (chipValue: string) => {
    const now = new Date();
    let time: string;
    switch (chipValue) {
      case 'Now':       time = toHHMM(now); break;
      case 'In 1 hr':  time = toHHMM(new Date(now.getTime() + 60 * 60 * 1000)); break;
      case 'Tonight 6PM': time = '18:00'; break;
      case 'Tonight 8PM': time = '20:00'; break;
      case 'Tonight 9PM': time = '21:00'; break;
      default: time = toHHMM(now);
    }
    setSelectedTimePreset(chipValue);
    applyStartTime(time);
  };

  const openTimePicker = (target: 'start' | 'end') => {
    const current = target === 'start' ? startTime : endTime;
    let initial = new Date();
    if (current && /^\d{2}:\d{2}$/.test(current)) {
      const [h, m] = current.split(':').map(Number);
      initial = new Date();
      initial.setHours(h, m, 0, 0);
    }
    setTimePickerValue(initial);
    setTimePickerTarget(target);
    setShowTimePicker(true);
  };

  const handleTimePickerConfirm = (date: Date) => {
    const hhMM = toHHMM(date);
    if (timePickerTarget === 'start') {
      setSelectedTimePreset('custom');
      applyStartTime(hhMM);
    } else {
      setEndTime(hhMM);
      setEndTimeManuallySet(true);
    }
    setShowTimePicker(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedRole) {
      Alert.alert('Missing Role', 'Please select a role for this shift.');
      return;
    }
    if (!selectedUrgency) {
      Alert.alert('Missing Urgency', 'Please select an urgency level.');
      return;
    }
    const payCents = parseMoneyInput(hourlyPay);
    if (payCents === null || !isValidHourlyRate(payCents)) {
      Alert.alert('Invalid Pay Rate', 'Please enter a valid hourly rate ($1.00 – $500.00).');
      return;
    }
    if (!startTime.trim()) {
      Alert.alert('Missing Start Time', 'Please select when the shift starts.');
      return;
    }
    // Validate start time not in the past for today's date
    if (isToday(selectedDate) && /^\d{2}:\d{2}$/.test(startTime) && selectedTimePreset !== 'Now') {
      const [h, m] = startTime.split(':').map(Number);
      const shiftStart = new Date();
      shiftStart.setHours(h, m, 0, 0);
      if (shiftStart.getTime() < new Date().getTime() - 5 * 60 * 1000) {
        Alert.alert('Start Time Passed', 'The selected start time has already passed. Please pick a future time.');
        return;
      }
    }
    // Log overnight shifts but don't block
    if (endTime && startTime && /^\d{2}:\d{2}$/.test(endTime) && /^\d{2}:\d{2}$/.test(startTime)) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if (eh * 60 + em < sh * 60 + sm) {
        console.log(`[PostShift] end_time ${endTime} < start_time ${startTime} — treating as next-day overnight shift`);
      }
    }

    setLoading(true);
    const payload = {
      role: selectedRole,
      urgency: selectedUrgency,
      hourly_pay_cents: payCents,
      start_time: startTime,
      end_time: endTime,
      workers_needed: workersNeeded,
      location,
      dress_code: dressCode,
      experience_required: experience,
      certifications_required: certs,
      notes,
      manager_id: currentUser?.id,
      status: 'open',
      date: selectedDate,
      is_rush: isRush,
    };

    console.log(`[PostShift] date="${selectedDate}" start_time="${startTime}" end_time="${endTime}" is_rush=${isRush}`);

    try {
      const response = await authenticatedPost<{ id?: string; pinged_worker_count?: number; shift?: { id?: string } }>('/api/shifts', payload);
      const shiftId = (response as any)?.id ?? (response as any)?.shift?.id ?? null;
      const pinged = (response as any)?.pinged_worker_count ?? 0;

      if (isRush && shiftId) {
        console.log(`[PostShift] pinged=${pinged}`);
        setPostedShiftId(shiftId);
        setPinnedWorkerCount(pinged);
        setClaimedWorkerName(null);
        setWatchingStartTime(startTime);
        setLoading(false);
        setRushWatchingModalVisible(true);
      } else {
        Alert.alert('⚡ Shift Blasted!', 'Workers nearby are being notified now.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
        setLoading(false);
      }
    } catch (err) {
      console.error('[CreateShift] Failed to post shift:', err);
      Alert.alert('Error', 'Could not post shift. Try again.');
      setLoading(false);
    }
  };

  const blastButtonOpacity = loading ? 0.6 : 1;

  if (subChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Post a Shift', headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.text }} />
        <MaterialIcons name="hourglass-empty" size={32} color={COLORS.textSecondary} />
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginTop: 12 }}>
          Checking account...
        </Text>
      </View>
    );
  }

  if (!isAdmin && !hasSubscription) {
    return (
      <PaywallScreen
        onSubscribe={() => {
          Alert.alert('Stripe Coming Soon', 'Subscription payments will be available shortly. Stay tuned!');
        }}
      />
    );
  }

  const markedDates: Record<string, { selected: boolean; selectedColor: string }> = {
    [selectedDate]: { selected: true, selectedColor: COLORS.primary },
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={styles.headerBack}>
            <MaterialIcons name="chevron-left" size={28} color={COLORS.text} />
          </AnimatedPressable>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>⚡ QUICK BLAST</Text>
          </View>
          <AnimatedPressable onPress={toggleAdvanced} style={styles.headerAdvanced}>
            <Text style={[styles.headerAdvancedText, showAdvanced && { color: COLORS.primary }]}>
              Advanced
            </Text>
          </AnimatedPressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PromiseBanner />
          <ProgressBar step={progressStep} />

          {/* ── Step 1: Role ──────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 1 — ROLE NEEDED" />
            <View style={styles.roleGrid}>
              {(ROLES as readonly any[]).map((r) => {
                const isActive = selectedRole === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setSelectedRole(r.key)}
                    activeOpacity={0.8}
                    style={[styles.roleCard, isActive ? styles.roleCardActive : styles.roleCardInactive]}
                  >
                    <View style={styles.roleCardIconWrapper}>
                      <RoleIcon lib={r.lib} icon={r.icon} color={isActive ? '#000' : COLORS.primary} />
                    </View>
                    <Text style={[styles.roleCardLabel, { color: isActive ? '#000' : COLORS.text }]} numberOfLines={1}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Step 2: Urgency ───────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 2 — URGENCY" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.urgencyRow}>
              {URGENCY_OPTIONS.map((u) => {
                const isActive = selectedUrgency === u.value;
                const accentColor = URGENCY_COLORS[u.value];
                const activeBg = accentColor + '22';
                const activeSublabel = accentColor + 'AA';
                return (
                  <AnimatedPressable
                    key={u.value}
                    onPress={() => setSelectedUrgency(u.value)}
                    style={[
                      styles.urgencyPill,
                      isActive
                        ? { backgroundColor: activeBg, borderColor: accentColor, borderWidth: 1.5,
                            ...(Platform.OS === 'web' ? { boxShadow: '0 0 12px rgba(0,0,0,0.4)' } : { shadowColor: accentColor, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }) }
                        : styles.urgencyPillInactive,
                    ]}
                  >
                    <MaterialIcons name={u.icon as any} size={22} color={isActive ? accentColor : COLORS.textSecondary} style={{ marginBottom: 4 }} />
                    <Text style={[styles.urgencyPillLabel, { color: isActive ? accentColor : COLORS.text }]}>{u.label}</Text>
                    <Text style={[styles.urgencyPillSublabel, { color: isActive ? activeSublabel : COLORS.textTertiary }]}>{u.sublabel}</Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Step 3: Pay Rate ──────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 3 — HOURLY PAY" />
            <View style={styles.payCard}>
              <Text style={styles.payCardLabel}>💰 SET YOUR PAY RATE</Text>
              <View style={styles.payInputRow}>
                <Text style={styles.payDollar}>$</Text>
                <TextInput
                  value={hourlyPay}
                  onChangeText={setHourlyPay}
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="decimal-pad"
                  style={styles.payInput}
                />
                <Text style={styles.payHr}>/hr</Text>
              </View>
              <View style={styles.payPresets}>
                {PAY_PRESETS.map((p) => {
                  const isCustom = p.value === 'custom';
                  const isActive = isCustom ? customPayMode : (!customPayMode && hourlyPay === p.value);
                  return (
                    <AnimatedPressable
                      key={p.value}
                      onPress={() => {
                        if (isCustom) { setCustomPayMode(true); setHourlyPay(''); }
                        else { setCustomPayMode(false); setHourlyPay(p.value); }
                      }}
                      style={[styles.payPresetBtn, isActive ? styles.payPresetActive : styles.payPresetInactive]}
                    >
                      <Text style={[styles.payPresetText, { color: isActive ? '#000' : COLORS.textSecondary }]}>{p.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Step 4: Date & Time ───────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 4 — DATE & TIME" />

            {/* Date pill */}
            <TouchableOpacity
              onPress={() => setCalendarOpen((v) => !v)}
              activeOpacity={0.8}
              style={styles.datePill}
            >
              <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
              <Text style={styles.datePillText}>{formatDateDisplay(selectedDate)}</Text>
              <MaterialIcons
                name={calendarOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {/* Inline calendar */}
            {calendarOpen && (
              <View style={styles.calendarWrapper}>
                <Calendar
                  minDate={todayYMD()}
                  markedDates={markedDates}
                  onDayPress={handleDateSelect}
                  theme={CALENDAR_THEME as any}
                  enableSwipeMonths
                />
              </View>
            )}

            {/* Start time */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.timeFieldLabel}>START TIME</Text>
              {isToday(selectedDate) ? (
                // Today: rush chips + Custom time chip
                <View>
                  <View style={styles.timePresets}>
                    {RUSH_CHIPS.map((chip) => {
                      const past = chipIsPast(chip.value, selectedDate);
                      const active = selectedTimePreset === chip.value;
                      return (
                        <AnimatedPressable
                          key={chip.value}
                          onPress={() => { if (!past) handleChipPress(chip.value); }}
                          disabled={past}
                          style={[
                            styles.timePresetBtn,
                            active ? styles.timePresetActive : styles.timePresetInactive,
                            past && styles.timePresetDisabled,
                          ]}
                        >
                          <Text style={[
                            styles.timePresetText,
                            { color: active ? COLORS.primary : past ? COLORS.textTertiary : COLORS.text },
                            past && { opacity: 0.4 },
                          ]}>
                            {chip.label}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                    {/* Custom time chip */}
                    <AnimatedPressable
                      onPress={() => openTimePicker('start')}
                      style={[
                        styles.timePresetBtn,
                        selectedTimePreset === 'custom' ? styles.timePresetActive : styles.timePresetInactive,
                      ]}
                    >
                      <Text style={[styles.timePresetText, { color: selectedTimePreset === 'custom' ? COLORS.primary : COLORS.text }]}>
                        ⏰ Custom...
                      </Text>
                    </AnimatedPressable>
                  </View>
                  {startTime ? (
                    <Text style={styles.selectedTimeDisplay}>
                      Selected: {formatTimeDisplay(startTime)}
                    </Text>
                  ) : null}
                </View>
              ) : (
                // Future date: single time picker field
                <TouchableOpacity onPress={() => openTimePicker('start')} activeOpacity={0.8} style={styles.timeField}>
                  <MaterialIcons name="access-time" size={16} color={COLORS.textSecondary} />
                  <Text style={[styles.timeFieldText, !startTime && { color: COLORS.textTertiary }]}>
                    {startTime ? formatTimeDisplay(startTime) : 'Tap to set start time'}
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* End time — always visible */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.timeFieldLabel}>
                END TIME {!endTimeManuallySet && startTime ? '(start + 5 hrs)' : ''}
              </Text>
              <TouchableOpacity
                onPress={() => openTimePicker('end')}
                activeOpacity={0.8}
                style={styles.timeField}
              >
                <MaterialIcons name="access-time" size={16} color={COLORS.textSecondary} />
                <Text style={[styles.timeFieldText, !endTime && { color: COLORS.textTertiary }]}>
                  {endTime ? formatTimeDisplay(endTime) : 'Tap to set end time'}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Rush Shift Toggle ──────────────────────────────────── */}
          <View style={[styles.section, {
            backgroundColor: isRush ? 'rgba(255,68,68,0.06)' : COLORS.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isRush ? 'rgba(255,68,68,0.3)' : COLORS.border,
            padding: 16,
            marginBottom: 16,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 2 }}>
                  🔥 Rush Shift
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                  Starts within 4 hours
                </Text>
              </View>
              <Switch
                value={isRush}
                onValueChange={setIsRush}
                trackColor={{ false: COLORS.surfaceSecondary, true: 'rgba(255,68,68,0.5)' }}
                thumbColor={isRush ? COLORS.danger : COLORS.textSecondary}
              />
            </View>
            {isRush && (
              <View style={{ marginTop: 12, backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <MaterialIcons name="info-outline" size={16} color={COLORS.danger} style={{ marginTop: 1 }} />
                <Text style={{ color: COLORS.danger, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', flex: 1, lineHeight: 18 }}>
                  Rush shifts are pushed instantly to available workers. We recommend a 20% pay bump for rush.
                </Text>
              </View>
            )}
          </View>

          {/* ── Workers Needed ────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="WORKERS NEEDED" />
            <View style={styles.stepperRow}>
              <AnimatedPressable onPress={() => setWorkersNeeded((n) => Math.max(1, n - 1))} style={styles.stepperBtn}>
                <MaterialIcons name="remove" size={22} color={COLORS.primary} />
              </AnimatedPressable>
              <Text style={styles.stepperValue}>{workersNeeded}</Text>
              <AnimatedPressable onPress={() => setWorkersNeeded((n) => Math.min(10, n + 1))} style={styles.stepperBtn}>
                <MaterialIcons name="add" size={22} color={COLORS.primary} />
              </AnimatedPressable>
            </View>
          </View>

          {/* ── Advanced Options ──────────────────────────────────── */}
          <Animated.View
            style={[styles.advancedSection, {
              opacity: advancedOpacity,
              maxHeight: advancedHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 800] }),
              overflow: 'hidden',
            }]}
          >
            <View style={styles.advancedInner}>
              <SectionLabel text="ADVANCED OPTIONS" />

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput value={location} onChangeText={setLocation} placeholder="e.g. 123 Main St, Kansas City" placeholderTextColor={COLORS.textTertiary} style={styles.textInput} />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Dress Code</Text>
                <TextInput value={dressCode} onChangeText={setDressCode} placeholder="e.g. All black, non-slip shoes" placeholderTextColor={COLORS.textTertiary} style={styles.textInput} />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Experience Required</Text>
                <TextInput value={experience} onChangeText={setExperience} placeholder="e.g. 2+ years bartending" placeholderTextColor={COLORS.textTertiary} style={styles.textInput} />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Certifications</Text>
                <View style={styles.certRow}>
                  {CERT_OPTIONS.map((c) => {
                    const isActive = certs.includes(c);
                    return (
                      <AnimatedPressable key={c} onPress={() => toggleCert(c)} style={[styles.certChip, isActive ? styles.certChipActive : styles.certChipInactive]}>
                        <Text style={[styles.certChipText, { color: isActive ? '#000' : COLORS.textSecondary }]}>{c}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput value={notes} onChangeText={setNotes} placeholder="Any additional details for workers..." placeholderTextColor={COLORS.textTertiary} multiline style={[styles.textInput, styles.textInputMultiline]} />
              </View>
            </View>
          </Animated.View>

          {/* ── Blast Button ──────────────────────────────────────── */}
          <View style={styles.blastWrapper}>
            <Animated.View style={[styles.blastGlow, {
              opacity: glowAnim,
              ...(Platform.OS === 'web' ? { boxShadow: '0 0 30px rgba(0,255,135,0.6)' } : {}),
            }]} />
            <AnimatedPressable onPress={handleSubmit} disabled={loading} style={[styles.blastBtn, { opacity: blastButtonOpacity }]}>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={styles.blastBtnText}>{loading ? 'Blasting...' : '⚡ BLAST SHIFT'}</Text>
                {!loading && <Text style={styles.blastBtnSub}>Workers nearby will be notified instantly</Text>}
              </View>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Rush Watching Modal ───────────────────────────────────── */}
      <Modal visible={rushWatchingModalVisible} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          {claimedWorkerName ? (
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,255,135,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, ...Platform.select({ web: { boxShadow: '0 0 40px rgba(0,255,135,0.4)' }, default: { shadowColor: '#00FF87', shadowOpacity: 0.4, shadowRadius: 30, elevation: 12 } }) }}>
                <Text style={{ fontSize: 52 }}>✅</Text>
              </View>
              <Text style={{ color: COLORS.primary, fontSize: 26, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', marginBottom: 8 }}>
                {claimedWorkerName} claimed it!
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
                They'll be there at {watchingStartTime}. Check your Shifts tab for updates.
              </Text>
              <AnimatedPressable onPress={() => { setRushWatchingModalVisible(false); router.replace('/(tabs)/(home)'); }}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 }}>
                  <Text style={{ color: '#000', fontSize: 15, fontFamily: 'SpaceGrotesk-Bold' }}>Back to Dashboard</Text>
                </View>
              </AnimatedPressable>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 48 }}>🔥</Text>
              </View>
              <Text style={{ color: COLORS.danger, fontSize: 26, fontFamily: 'SpaceGrotesk-Bold', textAlign: 'center', marginBottom: 8 }}>
                Pinged {pinnedWorkerCount} worker{pinnedWorkerCount !== 1 ? 's' : ''}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                Watching for claims... First worker to tap wins the shift.
              </Text>
              <ActivityIndicator color={COLORS.danger} size="large" style={{ marginBottom: 32 }} />
              <AnimatedPressable onPress={() => { setRushWatchingModalVisible(false); router.replace('/(tabs)/(home)'); }}>
                <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>Back to Dashboard</Text>
                </View>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Native time picker ────────────────────────────────────── */}
      <TimePickerModal
        visible={showTimePicker}
        label={timePickerTarget === 'start' ? 'Start Time' : 'End Time'}
        value={timePickerValue}
        onChange={handleTimePickerConfirm}
        onDismiss={() => setShowTimePicker(false)}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,135,0.25)',
  },
  headerBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1.5,
  },
  headerAdvanced: {
    width: 72,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerAdvancedText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },

  // Promise banner
  promiseBanner: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
    backgroundColor: 'rgba(0,255,135,0.06)',
  },
  promiseBannerText: {
    color: COLORS.primary,
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    letterSpacing: 2.5,
  },

  // Role grid
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  roleCard: {
    width: '48%',
    height: 110,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  roleCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 16px rgba(0,255,135,0.7)' }
      : { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 12 }),
  },
  roleCardInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleCardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCardLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    flexWrap: 'nowrap',
  },

  // Urgency
  urgencyRow: {
    gap: 8,
    paddingRight: 4,
  },
  urgencyPill: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    minWidth: 100,
  },
  urgencyPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  urgencyPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  urgencyPillLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    marginBottom: 1,
  },
  urgencyPillSublabel: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Regular',
    fontWeight: '400',
  },

  // Pay card
  payCard: {
    backgroundColor: 'rgba(0,255,135,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,135,0.2)',
    borderRadius: 16,
    padding: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 16px rgba(0,255,135,0.12)' }
      : { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 5 }),
  },
  payCardLabel: {
    color: COLORS.primary,
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  payInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 2,
  },
  payDollar: {
    color: COLORS.primary,
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    lineHeight: 44,
  },
  payInput: {
    color: COLORS.text,
    fontSize: 44,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
    lineHeight: 52,
  },
  payHr: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    fontWeight: '400',
    lineHeight: 44,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  payPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  payPresetBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  payPresetActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 8px rgba(0,255,135,0.5)' }
      : { shadowColor: '#00FF87', shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 }),
  },
  payPresetInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  payPresetText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
  },

  // Date pill
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,255,135,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  datePillText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
  },

  // Calendar
  calendarWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
    marginTop: 4,
  },

  // Time presets (chips)
  timePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 6,
  },
  timePresetBtn: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  timePresetActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  timePresetInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timePresetDisabled: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timePresetText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
  },

  // Selected time display
  selectedTimeDisplay: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginTop: 4,
    marginLeft: 2,
  },

  // Time field (tappable row for future-date time / end time)
  timeFieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-SemiBold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  timeFieldText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },

  // Text input
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    fontWeight: '400',
    minHeight: 44,
  },
  textInputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: COLORS.primary,
    fontSize: 44,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    minWidth: 56,
    textAlign: 'center',
    lineHeight: 52,
  },

  // Advanced
  advancedSection: {
    marginBottom: 0,
  },
  advancedInner: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 28,
    gap: 16,
  },
  advancedField: {
    gap: 8,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  certRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  certChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  certChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  certChipInactive: {
    backgroundColor: COLORS.surfaceSecondary,
    borderColor: COLORS.border,
  },
  certChipText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
  },

  // Blast button
  blastWrapper: {
    position: 'relative',
    marginTop: 4,
  },
  blastGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    ...(Platform.OS !== 'web'
      ? { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1.0, shadowRadius: 28, elevation: 16 }
      : {}),
  },
  blastBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blastBtnText: {
    color: '#000',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    letterSpacing: 1,
  },
  blastBtnSub: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Regular',
  },

  // Time picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pickerCancel: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  pickerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  pickerDone: {
    color: COLORS.primary,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
});
