import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/Colors';

// ─── Brand logo components ───────────────────────────────────────────────────

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

// ─── Animated pressable ───────────────────────────────────────────────────────

function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
}: {
  onPress: () => void;
  style?: object | object[];
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Fade-in entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate once authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('[AuthScreen] User authenticated, navigating to tabs');
      router.replace('/(tabs)/(home)');
    }
  }, [user, loading]);

  const clearErrors = () => {
    setError('');
    setEmailError('');
    setPasswordError('');
  };

  const validateEmail = (val: string) => {
    if (!val) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return 'Password is required';
    if (activeTab === 'signup' && val.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email));
  };

  const handlePasswordBlur = () => {
    setPasswordError(validatePassword(password));
  };

  const handleSubmit = async () => {
    clearErrors();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr) setEmailError(eErr);
    if (pErr) setPasswordError(pErr);
    if (eErr || pErr) return;

    setSubmitting(true);
    try {
      if (activeTab === 'signin') {
        console.log('[AuthScreen] Sign in with email pressed:', email);
        await signInWithEmail(email, password);
      } else {
        console.log('[AuthScreen] Sign up with email pressed:', email);
        await signUpWithEmail(email, password, name || undefined);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      console.warn('[AuthScreen] Email auth error:', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    console.log('[AuthScreen] Continue with Apple pressed');
    setSocialLoading('apple');
    setError('');
    try {
      await signInWithApple();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Apple sign in failed';
      if (!msg.toLowerCase().includes('cancel')) {
        console.warn('[AuthScreen] Apple auth error:', msg);
        setError(msg);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = async () => {
    console.log('[AuthScreen] Continue with Google pressed');
    setSocialLoading('google');
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      if (!msg.toLowerCase().includes('cancel')) {
        console.warn('[AuthScreen] Google auth error:', msg);
        setError(msg);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const switchTab = (tab: Tab) => {
    console.log('[AuthScreen] Switched to tab:', tab);
    setActiveTab(tab);
    clearErrors();
    setEmail('');
    setPassword('');
    setName('');
  };

  const submitLabel = activeTab === 'signin' ? 'Sign in' : 'Create account';
  const isAnyLoading = submitting || socialLoading !== null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoRow}>
              <Text style={styles.bolt}>⚡</Text>
              <Text style={styles.logoText}>On The Fly</Text>
            </View>
            <Text style={styles.tagline}>Instant Coverage.</Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <AnimatedPressable
              onPress={() => switchTab('signin')}
              style={[styles.tab, activeTab === 'signin' && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === 'signin' && styles.tabLabelActive]}>
                Sign in
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => switchTab('signup')}
              style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === 'signup' && styles.tabLabelActive]}>
                Sign up
              </Text>
            </AnimatedPressable>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Global error */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Name field (sign up only) */}
            {activeTab === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor={COLORS.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!isAnyLoading}
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !!emailError && styles.inputError]}
                placeholder="e.g. you@example.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isAnyLoading}
              />
              {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, !!passwordError && styles.inputError]}>
                <TextInput
                  style={styles.inputInner}
                  placeholder={activeTab === 'signup' ? 'At least 8 characters' : 'Your password'}
                  placeholderTextColor={COLORS.textTertiary}
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(validatePassword(v)); }}
                  onBlur={handlePasswordBlur}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  editable={!isAnyLoading}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
            </View>

            {/* Submit */}
            <AnimatedPressable
              onPress={handleSubmit}
              style={styles.primaryBtn}
              disabled={isAnyLoading}
            >
              {submitting ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>{submitLabel}</Text>
              )}
            </AnimatedPressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple — must be first per App Store rules */}
            <AnimatedPressable
              onPress={handleApple}
              style={styles.socialBtn}
              disabled={isAnyLoading}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <AppleLogo size={20} color="#FFFFFF" />
                  <Text style={styles.socialBtnText}>Continue with Apple</Text>
                </>
              )}
            </AnimatedPressable>

            {/* Google */}
            <AnimatedPressable
              onPress={handleGoogle}
              style={[styles.socialBtn, styles.socialBtnGoogle]}
              disabled={isAnyLoading}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={COLORS.text} size="small" />
              ) : (
                <>
                  <GoogleLogo size={20} />
                  <Text style={[styles.socialBtnText, styles.socialBtnTextGoogle]}>Continue with Google</Text>
                </>
              )}
            </AnimatedPressable>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            {activeTab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text
              style={styles.footerLink}
              onPress={() => switchTab(activeTab === 'signin' ? 'signup' : 'signin')}
            >
              {activeTab === 'signin' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  bolt: {
    fontSize: 36,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.5,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: '#0A0A0A',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 68, 68, 0.12)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.25)',
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 13,
  },
  eyeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryBtnText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 50,
  },
  socialBtnGoogle: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  socialBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  socialBtnTextGoogle: {
    color: COLORS.text,
  },
  footer: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    marginTop: 20,
  },
  footerLink: {
    color: COLORS.primary,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
});
