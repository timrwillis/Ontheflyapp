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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Layout constants ────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROLE_CARD_SIZE = (SCREEN_WIDTH - 20 * 2 - 10) / 2; // 2 columns, 20px side padding, 10px gap

// ─── Data ────────────────────────────────────────────────────────────────────

const ROLES: { label: string; icon: string; value: string }[] = [
  { label: 'Bartender',   icon: 'local-bar',        value: 'Bartender' },
  { label: 'Server',      icon: 'room-service',     value: 'Server' },
  { label: 'Line Cook',   icon: 'outdoor-grill',    value: 'Line Cook' },
  { label: 'Dishwasher',  icon: 'water-drop',       value: 'Dishwasher' },
  { label: 'Host',        icon: 'emoji-people',     value: 'Host' },
  { label: 'Event Staff', icon: 'celebration',      value: 'Event Staff' },
  { label: 'Barback',     icon: 'sports-bar',       value: 'Barback' },
  { label: 'Security',    icon: 'security',         value: 'Security' },
];

const URGENCY_OPTIONS: { label: string; icon: string; sublabel: string; value: string }[] = [
  { label: 'ASAP',          icon: 'warning',     sublabel: 'Right now',      value: 'asap' },
  { label: 'Tonight',       icon: 'nightlight',  sublabel: 'This evening',   value: 'tonight' },
  { label: 'Rush Coverage', icon: 'bolt',        sublabel: 'Emergency fill', value: 'rush' },
  { label: 'Weekend Rush',  icon: 'weekend',     sublabel: 'Fri–Sun',        value: 'weekend' },
  { label: 'Future Shift',  icon: 'event',       sublabel: 'Plan ahead',     value: 'future' },
];

const URGENCY_COLORS: Record<string, string> = {
  asap: '#FF3B30',
  tonight: '#FF9500',
  rush: '#FF6B35',
  weekend: '#AF52DE',
  future: '#00FF87',
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

const TIME_PRESETS: { label: string; value: string }[] = [
  { label: '🔴 Now', value: 'Now' },
  { label: '⏱ In 1 hr', value: 'In 1 hr' },
  { label: '🌆 Tonight 6PM', value: 'Tonight 6PM' },
  { label: '🌙 Tonight 9PM', value: 'Tonight 9PM' },
];

const CERT_OPTIONS = ['TIPS', 'ServSafe', 'Food Handler', 'Alcohol Awareness'];

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
  // step: 0-4 (how many of the 4 required fields are filled)
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
                  ? {
                      shadowColor: COLORS.primary,
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      elevation: 3,
                    }
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateShiftScreen() {
  const router = useRouter();
  const { currentUser } = useRole();

  // Required fields
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('');
  const [hourlyPay, setHourlyPay] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');

  // Workers stepper
  const [workersNeeded, setWorkersNeeded] = useState(1);

  // Advanced fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [experience, setExperience] = useState('');
  const [certs, setCerts] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [customPayMode, setCustomPayMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pulsing glow animation for blast button
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [glowAnim]);

  // Advanced section collapse animation
  const advancedHeight = useRef(new Animated.Value(0)).current;
  const advancedOpacity = useRef(new Animated.Value(0)).current;

  const toggleAdvanced = useCallback(() => {
    const next = !showAdvanced;
    console.log('[CreateShift] Advanced options toggled:', next ? 'open' : 'closed');
    setShowAdvanced(next);
    Animated.parallel([
      Animated.timing(advancedHeight, {
        toValue: next ? 1 : 0,
        duration: 280,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(advancedOpacity, {
        toValue: next ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [showAdvanced, advancedHeight, advancedOpacity]);

  // Progress: count filled required fields
  const progressStep =
    (selectedRole ? 1 : 0) +
    (selectedUrgency ? 1 : 0) +
    (Number(hourlyPay) > 0 ? 1 : 0) +
    (startTime.trim().length > 0 ? 1 : 0);

  const toggleCert = (c: string) => {
    console.log('[CreateShift] Cert toggled:', c);
    setCerts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleSubmit = async () => {
    console.log('[CreateShift] Blast shift button pressed');
    if (!selectedRole) {
      Alert.alert('Missing Role', 'Please select a role for this shift.');
      return;
    }
    if (!selectedUrgency) {
      Alert.alert('Missing Urgency', 'Please select an urgency level.');
      return;
    }
    if (!hourlyPay || Number(hourlyPay) <= 0) {
      Alert.alert('Missing Pay Rate', 'Please enter the hourly pay rate.');
      return;
    }
    if (!startTime.trim()) {
      Alert.alert('Missing Start Time', 'Please enter when the shift starts.');
      return;
    }

    setLoading(true);
    const payload = {
      role: selectedRole,
      urgency: selectedUrgency,
      hourly_pay: Number(hourlyPay),
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
      date: new Date().toISOString().split('T')[0],
    };
    console.log('[CreateShift] Submitting shift payload:', payload);

    try {
      await apiPost('/api/shifts', payload);
      console.log('[CreateShift] Shift posted successfully');
      Alert.alert('⚡ Shift Blasted!', 'Workers nearby are being notified now.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[CreateShift] Error posting shift:', err);
      Alert.alert('Error', 'Could not post shift. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const blastButtonOpacity = loading ? 0.6 : 1;

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
          <AnimatedPressable
            onPress={() => {
              console.log('[CreateShift] Back button pressed');
              router.back();
            }}
            style={styles.headerBack}
          >
            <MaterialIcons name="chevron-left" size={28} color={COLORS.text} />
          </AnimatedPressable>

          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>⚡ QUICK BLAST</Text>
          </View>

          <AnimatedPressable
            onPress={toggleAdvanced}
            style={styles.headerAdvanced}
          >
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
          {/* Promise Banner */}
          <PromiseBanner />

          {/* Progress Bar */}
          <ProgressBar step={progressStep} />

          {/* ── Step 1: Role ─────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 1 — ROLE NEEDED" />
            <View style={styles.roleGrid}>
              {ROLES.map((r) => {
                const isActive = selectedRole === r.value;
                return (
                  <AnimatedPressable
                    key={r.value}
                    onPress={() => {
                      console.log('[CreateShift] Role selected:', r.value);
                      setSelectedRole(r.value);
                    }}
                    style={[
                      styles.roleCard,
                      isActive ? styles.roleCardActive : styles.roleCardInactive,
                    ]}
                  >
                    <View style={styles.roleCardIconWrapper}>
                      <MaterialIcons
                        name={r.icon as any}
                        size={28}
                        color={isActive ? '#000' : COLORS.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.roleCardLabel,
                        { color: isActive ? '#000' : COLORS.text },
                      ]}
                      numberOfLines={1}
                    >
                      {r.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* ── Step 2: Urgency ──────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 2 — URGENCY" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.urgencyRow}
            >
              {URGENCY_OPTIONS.map((u) => {
                const isActive = selectedUrgency === u.value;
                const accentColor = URGENCY_COLORS[u.value];
                const activeBg = accentColor + '22';
                const activeSublabel = accentColor + 'AA';
                return (
                  <AnimatedPressable
                    key={u.value}
                    onPress={() => {
                      console.log('[CreateShift] Urgency selected:', u.value);
                      setSelectedUrgency(u.value);
                    }}
                    style={[
                      styles.urgencyPill,
                      isActive
                        ? {
                            backgroundColor: activeBg,
                            borderColor: accentColor,
                            borderWidth: 1.5,
                            shadowColor: accentColor,
                            shadowOpacity: 0.4,
                            shadowRadius: 12,
                            elevation: 8,
                          }
                        : styles.urgencyPillInactive,
                    ]}
                  >
                    <MaterialIcons
                      name={u.icon as any}
                      size={22}
                      color={isActive ? accentColor : COLORS.textSecondary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text
                      style={[
                        styles.urgencyPillLabel,
                        { color: isActive ? accentColor : COLORS.text },
                      ]}
                    >
                      {u.label}
                    </Text>
                    <Text
                      style={[
                        styles.urgencyPillSublabel,
                        { color: isActive ? activeSublabel : COLORS.textTertiary },
                      ]}
                    >
                      {u.sublabel}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Step 3: Pay Rate ─────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 3 — HOURLY PAY" />
            <View style={styles.payCard}>
              <Text style={styles.payCardLabel}>💰 SET YOUR PAY RATE</Text>
              <View style={styles.payInputRow}>
                <Text style={styles.payDollar}>$</Text>
                <TextInput
                  value={hourlyPay}
                  onChangeText={(t) => {
                    console.log('[CreateShift] Pay rate changed:', t);
                    setHourlyPay(t);
                  }}
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
                        console.log('[CreateShift] Pay preset tapped:', p.value);
                        if (isCustom) {
                          setCustomPayMode(true);
                          setHourlyPay('');
                        } else {
                          setCustomPayMode(false);
                          setHourlyPay(p.value);
                        }
                      }}
                      style={[
                        styles.payPresetBtn,
                        isActive ? styles.payPresetActive : styles.payPresetInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.payPresetText,
                          { color: isActive ? '#000' : COLORS.textSecondary },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ── Step 4: Start Time ───────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="STEP 4 — WHEN DOES IT START?" />
            <View style={styles.timePresets}>
              {TIME_PRESETS.map((t) => {
                const isActive = startTime === t.value;
                return (
                  <AnimatedPressable
                    key={t.value}
                    onPress={() => {
                      console.log('[CreateShift] Time preset tapped:', t.value);
                      setStartTime(t.value);
                    }}
                    style={[
                      styles.timePresetBtn,
                      isActive ? styles.timePresetActive : styles.timePresetInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePresetText,
                        { color: isActive ? COLORS.primary : COLORS.text },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <TextInput
              value={startTime}
              onChangeText={(t) => {
                console.log('[CreateShift] Start time manually entered:', t);
                setStartTime(t);
              }}
              placeholder="Or type a custom time..."
              placeholderTextColor={COLORS.textTertiary}
              style={styles.textInput}
            />
          </View>

          {/* ── Step 5: Workers Needed ───────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel text="WORKERS NEEDED" />
            <View style={styles.stepperRow}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[CreateShift] Workers decreased');
                  setWorkersNeeded((n) => Math.max(1, n - 1));
                }}
                style={styles.stepperBtn}
              >
                <MaterialIcons name="remove" size={22} color={COLORS.primary} />
              </AnimatedPressable>
              <Text style={styles.stepperValue}>{workersNeeded}</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[CreateShift] Workers increased');
                  setWorkersNeeded((n) => Math.min(10, n + 1));
                }}
                style={styles.stepperBtn}
              >
                <MaterialIcons name="add" size={22} color={COLORS.primary} />
              </AnimatedPressable>
            </View>
          </View>

          {/* ── Advanced Options ─────────────────────────────────── */}
          <Animated.View
            style={[
              styles.advancedSection,
              {
                opacity: advancedOpacity,
                maxHeight: advancedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 800],
                }),
                overflow: 'hidden',
              },
            ]}
          >
            <View style={styles.advancedInner}>
              <SectionLabel text="ADVANCED OPTIONS" />

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <TextInput
                  value={endTime}
                  onChangeText={(t) => {
                    console.log('[CreateShift] End time changed:', t);
                    setEndTime(t);
                  }}
                  placeholder="e.g. 11:00 PM"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Location</Text>
                <TextInput
                  value={location}
                  onChangeText={(t) => {
                    console.log('[CreateShift] Location changed:', t);
                    setLocation(t);
                  }}
                  placeholder="e.g. 123 Main St, Chicago"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Dress Code</Text>
                <TextInput
                  value={dressCode}
                  onChangeText={(t) => {
                    console.log('[CreateShift] Dress code changed:', t);
                    setDressCode(t);
                  }}
                  placeholder="e.g. All black, non-slip shoes"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Experience Required</Text>
                <TextInput
                  value={experience}
                  onChangeText={(t) => {
                    console.log('[CreateShift] Experience changed:', t);
                    setExperience(t);
                  }}
                  placeholder="e.g. 2+ years bartending"
                  placeholderTextColor={COLORS.textTertiary}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Certifications</Text>
                <View style={styles.certRow}>
                  {CERT_OPTIONS.map((c) => {
                    const isActive = certs.includes(c);
                    return (
                      <AnimatedPressable
                        key={c}
                        onPress={() => toggleCert(c)}
                        style={[
                          styles.certChip,
                          isActive ? styles.certChipActive : styles.certChipInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.certChipText,
                            { color: isActive ? '#000' : COLORS.textSecondary },
                          ]}
                        >
                          {c}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.advancedField}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={(t) => {
                    console.log('[CreateShift] Notes changed');
                    setNotes(t);
                  }}
                  placeholder="Any additional details for workers..."
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  style={[styles.textInput, styles.textInputMultiline]}
                />
              </View>
            </View>
          </Animated.View>

          {/* ── Blast Button ─────────────────────────────────────── */}
          <View style={styles.blastWrapper}>
            <Animated.View
              style={[
                styles.blastGlow,
                {
                  opacity: glowAnim,
                  ...(Platform.OS === 'web'
                    ? { boxShadow: '0 0 30px rgba(0,255,135,0.6)' }
                    : {}),
                },
              ]}
            />
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.blastBtn, { opacity: blastButtonOpacity }]}
            >
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={styles.blastBtnText}>
                  {loading ? 'Blasting...' : '⚡ BLAST SHIFT'}
                </Text>
                {!loading && (
                  <Text style={styles.blastBtnSub}>Workers nearby will be notified instantly</Text>
                )}
              </View>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  // Role grid — 2-column square cards
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: ROLE_CARD_SIZE,
    height: ROLE_CARD_SIZE * 0.68,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  roleCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
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
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  payCardLabel: {
    color: COLORS.primary,
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 10,
  },

  // Pay
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
    shadowColor: '#00FF87',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
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

  // Time
  timePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },
  timePresetBtn: {
    borderRadius: 9,
    paddingHorizontal: 14,
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
  timePresetText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
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
      ? {
          shadowColor: '#00FF87',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1.0,
          shadowRadius: 28,
          elevation: 16,
        }
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
});
