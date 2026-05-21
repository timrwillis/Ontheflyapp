import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Screen = 'landing' | 'signin' | 'signup';
type WorkerRole = 'worker' | 'manager' | null;

const ND = Platform.OS !== 'web';

const primaryBtnGlow = Platform.select({
  web: { boxShadow: '0 0 20px rgba(0,255,135,0.35)' },
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
}) as object;

const logoGlowStyle = Platform.select({
  web: {},
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 14,
  },
}) as object;

const roleActiveGlow = Platform.select({
  web: { boxShadow: '0 0 16px rgba(0,255,135,0.3)' },
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
}) as object;

function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <Path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <Path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <Path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </Svg>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [screen, setScreen] = useState<Screen>('landing');
  const [selectedRole, setSelectedRole] = useState<WorkerRole>(null);

  // Sign In state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [siLoading, setSiLoading] = useState(false);

  // Sign Up state
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suShowPw, setSuShowPw] = useState(false);
  const [suLoading, setSuLoading] = useState(false);

  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/(home)');
    }
  }, [user, loading]);

  const navigateTo = useCallback((newScreen: Screen) => {
    const forward = newScreen !== 'landing';
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: ND }),
      Animated.timing(slideX, { toValue: forward ? -28 : 28, duration: 130, useNativeDriver: ND }),
    ]).start(() => {
      setScreen(newScreen);
      slideX.setValue(forward ? 28 : -28);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: ND }),
        Animated.timing(slideX, { toValue: 0, duration: 200, useNativeDriver: ND }),
      ]).start();
    });
  }, [fadeAnim, slideX]);

  const handleSignIn = async () => {
    if (!siEmail.trim()) { Alert.alert('Missing Email', 'Please enter your email address.'); return; }
    if (!siPassword) { Alert.alert('Missing Password', 'Please enter your password.'); return; }
    setSiLoading(true);
    try {
      await signInWithEmail(siEmail.trim(), siPassword);
    } catch (err) {
      Alert.alert('Sign In Failed', err instanceof Error ? err.message : 'Please check your credentials and try again.');
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!suName.trim()) { Alert.alert('Missing Name', 'Please enter your full name.'); return; }
    if (!suEmail.trim()) { Alert.alert('Missing Email', 'Please enter your email address.'); return; }
    if (suPassword.length < 8) { Alert.alert('Password Too Short', 'Password must be at least 8 characters.'); return; }
    setSuLoading(true);
    try {
      await signUpWithEmail(suEmail.trim(), suPassword, suName.trim());
    } catch (err) {
      Alert.alert('Sign Up Failed', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSuLoading(false);
    }
  };

  const handleApple = async () => {
    setSocialLoading('apple');
    try {
      await signInWithApple();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apple sign in failed';
      if (!msg.toLowerCase().includes('cancel')) Alert.alert('Sign In Failed', msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = async () => {
    setSocialLoading('google');
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      if (!msg.toLowerCase().includes('cancel')) Alert.alert('Sign In Failed', msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const isAnyLoading = siLoading || suLoading || !!socialLoading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideX }] }}>

        {/* ─── LANDING ─────────────────────────────────────────────── */}
        {screen === 'landing' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 64 }}>
              <View style={{ marginBottom: 4, ...logoGlowStyle }}>
                <Text style={{ fontSize: 72 }}>⚡</Text>
              </View>
              <Text style={styles.logoText}>On The Fly</Text>
              <Text style={styles.tagline}>Instant Coverage.</Text>
              <Text style={styles.heroText}>The fastest way to{'\n'}staff your shift.</Text>
            </View>

            {/* CTAs */}
            <View style={{ gap: 14 }}>
              <Pressable onPress={() => navigateTo('signup')}>
                <View style={{ ...styles.primaryBtn, ...primaryBtnGlow }}>
                  <Text style={styles.primaryBtnText}>Get Started</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => navigateTo('signin')}>
                <View style={styles.outlineBtn}>
                  <Text style={styles.outlineBtnText}>Sign In</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* ─── SIGN IN ─────────────────────────────────────────────── */}
        {screen === 'signin' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 28, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => navigateTo('landing')} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
            </Pressable>

            <View style={{ marginBottom: 36 }}>
              <Text style={styles.screenTitle}>Welcome Back</Text>
              <Text style={styles.screenSubtitle}>Sign in to your account</Text>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textTertiary}
                value={siEmail}
                onChangeText={setSiEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isAnyLoading}
              />
            </View>

            {/* Password */}
            <View style={[styles.fieldGroup, { marginTop: 16 }]}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Your password"
                  placeholderTextColor={COLORS.textTertiary}
                  value={siPassword}
                  onChangeText={setSiPassword}
                  secureTextEntry={!siShowPw}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  editable={!isAnyLoading}
                />
                <Pressable onPress={() => setSiShowPw(v => !v)} style={styles.showHide}>
                  <Text style={styles.showHideText}>{siShowPw ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Sign In button */}
            <Pressable onPress={handleSignIn} disabled={isAnyLoading} style={{ marginTop: 32 }}>
              <View style={{ ...styles.primaryBtn, ...primaryBtnGlow, ...(isAnyLoading ? styles.disabled : {}) }}>
                {siLoading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.primaryBtnText}>Sign In</Text>}
              </View>
            </Pressable>

            {/* Forgot password */}
            <Pressable
              onPress={() => Alert.alert('Password Reset', 'Please contact support to reset your password.')}
              style={{ marginTop: 18, alignItems: 'center' }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                Forgot password?
              </Text>
            </Pressable>

            {/* Switch to sign up */}
            <Text style={[styles.switchLink, { marginTop: 12 }]}>
              Don't have an account?{' '}
              <Text style={styles.switchLinkCta} onPress={() => navigateTo('signup')}>Sign up</Text>
            </Text>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple */}
            <Pressable onPress={handleApple} disabled={isAnyLoading}>
              <View style={{ ...styles.socialBtn, ...(isAnyLoading ? styles.disabled : {}) }}>
                {socialLoading === 'apple'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <>
                      <AppleLogo size={20} color="#FFF" />
                      <Text style={styles.socialBtnText}>Continue with Apple</Text>
                    </>
                  )}
              </View>
            </Pressable>

            {/* Google */}
            <Pressable onPress={handleGoogle} disabled={isAnyLoading} style={{ marginTop: 12 }}>
              <View style={{ ...styles.socialBtn, ...styles.googleBtn, ...(isAnyLoading ? styles.disabled : {}) }}>
                {socialLoading === 'google'
                  ? <ActivityIndicator color={COLORS.text} size="small" />
                  : (
                    <>
                      <GoogleLogo size={20} />
                      <Text style={[styles.socialBtnText, { color: COLORS.text }]}>Continue with Google</Text>
                    </>
                  )}
              </View>
            </Pressable>
          </ScrollView>
        )}

        {/* ─── SIGN UP ─────────────────────────────────────────────── */}
        {screen === 'signup' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 28, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => navigateTo('landing')} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
            </Pressable>

            <View style={{ marginBottom: 28 }}>
              <Text style={styles.screenTitle}>Create Account</Text>
              <Text style={styles.screenSubtitle}>Join On The Fly today</Text>
            </View>

            {/* Role selector */}
            <View style={{ marginBottom: 28 }}>
              <Text style={styles.sectionLabel}>I AM A...</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => setSelectedRole('worker')} style={{ flex: 1 }}>
                  <View style={[
                    styles.roleCard,
                    selectedRole === 'worker' && styles.roleCardActive,
                    selectedRole === 'worker' ? (roleActiveGlow as any) : null,
                  ]}>
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>👷</Text>
                    <Text style={styles.roleCardTitle}>Worker</Text>
                    <Text style={styles.roleCardSub}>Find shifts near me</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => setSelectedRole('manager')} style={{ flex: 1 }}>
                  <View style={[
                    styles.roleCard,
                    selectedRole === 'manager' && styles.roleCardActive,
                    selectedRole === 'manager' ? (roleActiveGlow as any) : null,
                  ]}>
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>🏢</Text>
                    <Text style={styles.roleCardTitle}>Manager</Text>
                    <Text style={styles.roleCardSub}>Post shifts for my venue</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Alex Johnson"
                placeholderTextColor={COLORS.textTertiary}
                value={suName}
                onChangeText={setSuName}
                autoCapitalize="words"
                editable={!isAnyLoading}
              />
            </View>

            {/* Email */}
            <View style={[styles.fieldGroup, { marginTop: 16 }]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textTertiary}
                value={suEmail}
                onChangeText={setSuEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isAnyLoading}
              />
            </View>

            {/* Password */}
            <View style={[styles.fieldGroup, { marginTop: 16 }]}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="At least 8 characters"
                  placeholderTextColor={COLORS.textTertiary}
                  value={suPassword}
                  onChangeText={setSuPassword}
                  secureTextEntry={!suShowPw}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  editable={!isAnyLoading}
                />
                <Pressable onPress={() => setSuShowPw(v => !v)} style={styles.showHide}>
                  <Text style={styles.showHideText}>{suShowPw ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Create Account button */}
            <Pressable onPress={handleSignUp} disabled={isAnyLoading} style={{ marginTop: 32 }}>
              <View style={{ ...styles.primaryBtn, ...primaryBtnGlow, ...(isAnyLoading ? styles.disabled : {}) }}>
                {suLoading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.primaryBtnText}>Create Account</Text>}
              </View>
            </Pressable>

            {/* Switch to sign in */}
            <Text style={[styles.switchLink, { marginTop: 20 }]}>
              Already have an account?{' '}
              <Text style={styles.switchLinkCta} onPress={() => navigateTo('signin')}>Sign in</Text>
            </Text>
          </ScrollView>
        )}

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Landing
  logoText: {
    color: COLORS.primary,
    fontSize: 46,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: -2,
    marginBottom: 6,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    marginBottom: 24,
  },
  heroText: {
    color: COLORS.text,
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    lineHeight: 30,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  outlineBtn: {
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  outlineBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  disabled: {
    opacity: 0.55,
  },

  // Navigation
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Screen titles
  screenTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: -1,
    marginBottom: 6,
  },
  screenSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },

  // Form
  fieldGroup: {},
  fieldLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  showHide: {
    paddingLeft: 12,
    paddingVertical: 14,
  },
  showHideText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },

  // Section labels
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-SemiBold',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Role cards
  roleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
    minHeight: 128,
    justifyContent: 'center',
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  roleCardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 4,
  },
  roleCardSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },

  // Links
  switchLink: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },
  switchLinkCta: {
    color: COLORS.primary,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Regular',
  },

  // Social buttons
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socialBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  googleBtn: {
    backgroundColor: COLORS.surfaceSecondary,
  },
});
