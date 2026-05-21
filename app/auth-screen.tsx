import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';

// ─── Brand logo components ────────────────────────────────────────────────────

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

// ─── Main screen ──────────────────────────────────────────────────────────────

type Screen = 'landing' | 'signin' | 'signup';

export default function AuthScreen() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [screen, setScreen] = useState<Screen>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'worker' | 'manager'>('worker');

  const isSubmitting = useRef(false);

  useEffect(() => {
    if (!loading && user) {
      console.log('[AuthScreen] User authenticated, navigating to home');
      router.replace('/(tabs)/(home)');
    }
  }, [user, loading]);

  const handleSignIn = async () => {
    console.log('[AuthScreen] Sign in button pressed', { email });
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSubmitting(true);
    setError('');
    try {
      console.log('[AuthScreen] Calling signInWithEmail');
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      console.log('[AuthScreen] Sign in error:', msg);
      setError(msg);
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    console.log('[AuthScreen] Sign up button pressed', { email, name, selectedRole });
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSubmitting(true);
    setError('');
    try {
      console.log('[AuthScreen] Calling signUpWithEmail');
      await signUpWithEmail(email, password, name || undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      console.log('[AuthScreen] Sign up error:', msg);
      setError(msg);
    } finally {
      isSubmitting.current = false;
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
      console.log('[AuthScreen] Apple sign in error:', msg);
      if (!msg.toLowerCase().includes('cancel')) setError(msg);
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
      console.log('[AuthScreen] Google sign in error:', msg);
      if (!msg.toLowerCase().includes('cancel')) setError(msg);
    } finally {
      setSocialLoading(null);
    }
  };

  // ─── Landing ────────────────────────────────────────────────────────────────

  if (screen === 'landing') {
    return (
      <View style={styles.landingRoot}>
        <View style={styles.landingTop}>
          <Text style={styles.landingBolt}>⚡</Text>
          <Text style={styles.landingTitle}>On The Fly</Text>
          <Text style={styles.landingTagline}>Instant Coverage.</Text>
        </View>
        <View style={styles.landingBottom}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={() => {
              console.log('[AuthScreen] Get Started pressed');
              setScreen('signup');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => {
              console.log('[AuthScreen] Sign In pressed from landing');
              setScreen('signin');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
          <Text style={styles.termsText}>By continuing you agree to our Terms of Service</Text>
        </View>
      </View>
    );
  }

  // ─── Sign In ─────────────────────────────────────────────────────────────────

  if (screen === 'signin') {
    return (
      <KeyboardAvoidingView
        style={styles.kvRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SafeAreaView style={styles.safeArea}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                console.log('[AuthScreen] Back pressed from sign in');
                setScreen('landing');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.screenTitle}>Welcome Back</Text>
            <Text style={styles.screenSubtitle}>Sign in to your On The Fly account</Text>

            {/* Email */}
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={[styles.textInput, styles.fieldMargin]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#555555"
              placeholder="you@example.com"
            />

            {/* Password */}
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.passwordRow, styles.fieldMargin]}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#555555"
                placeholder="Your password"
              />
              <TouchableOpacity
                onPress={() => {
                  console.log('[AuthScreen] Toggle password visibility');
                  setShowPassword((v) => !v);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => console.log('[AuthScreen] Forgot password pressed')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerLabelWrap}>
                <Text style={styles.dividerLabel}>or</Text>
              </View>
            </View>

            {/* Apple */}
            <TouchableOpacity
              style={[styles.socialBtn, styles.socialBtnMarginTop]}
              onPress={handleApple}
              activeOpacity={0.85}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <AppleLogo size={20} color="#FFFFFF" />
                  <Text style={styles.socialBtnText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity
              style={[styles.socialBtn, styles.socialBtnMarginTopSm]}
              onPress={handleGoogle}
              activeOpacity={0.85}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color="#F0F0F0" />
              ) : (
                <>
                  <GoogleLogo size={20} />
                  <Text style={styles.socialBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('[AuthScreen] Switch to sign up pressed');
                  setScreen('signup');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.switchLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Sign Up ─────────────────────────────────────────────────────────────────

  const workerSelected = selectedRole === 'worker';
  const managerSelected = selectedRole === 'manager';

  return (
    <KeyboardAvoidingView
      style={styles.kvRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              console.log('[AuthScreen] Back pressed from sign up');
              setScreen('landing');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.screenTitle}>Create Account</Text>
          <Text style={[styles.screenSubtitle, styles.signupSubtitle]}>Join On the Fly today</Text>

          {/* Role selector */}
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                workerSelected ? styles.roleCardSelected : styles.roleCardUnselected,
              ]}
              onPress={() => {
                console.log('[AuthScreen] Role selected: worker');
                setSelectedRole('worker');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.roleEmoji}>👷</Text>
              <Text style={styles.roleTitle}>Worker</Text>
              <Text style={styles.roleSubtitle}>Pick up shifts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleCard,
                managerSelected ? styles.roleCardSelected : styles.roleCardUnselected,
              ]}
              onPress={() => {
                console.log('[AuthScreen] Role selected: manager');
                setSelectedRole('manager');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.roleEmoji}>🏢</Text>
              <Text style={styles.roleTitle}>Manager</Text>
              <Text style={styles.roleSubtitle}>Post shifts</Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={[styles.textInput, styles.fieldMargin]}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholderTextColor="#555555"
            placeholder="Alex Johnson"
          />

          {/* Email */}
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={[styles.textInput, styles.fieldMargin]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#555555"
            placeholder="you@example.com"
          />

          {/* Password */}
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.passwordRow, styles.fieldMargin]}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#555555"
              placeholder="At least 8 characters"
            />
            <TouchableOpacity
              onPress={() => {
                console.log('[AuthScreen] Toggle password visibility');
                setShowPassword((v) => !v);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, styles.signupSubmitBtn]}
            onPress={handleSignUp}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <View style={[styles.switchRow, styles.signupSwitchRow]}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[AuthScreen] Switch to sign in pressed');
                setScreen('signin');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.switchLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Landing ──────────────────────────────────────────────────────────────────
  landingRoot: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  landingTop: {
    flex: 0.55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landingBolt: {
    fontSize: 64,
    marginBottom: 16,
  },
  landingTitle: {
    color: '#00FF87',
    fontSize: 44,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: -1,
  },
  landingTagline: {
    color: '#8A8A8A',
    fontSize: 16,
    marginTop: 8,
  },
  landingBottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'flex-end',
  },
  getStartedBtn: {
    backgroundColor: '#00FF87',
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  getStartedBtnText: {
    color: '#000000',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
  },
  signInBtn: {
    backgroundColor: 'transparent',
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signInBtnText: {
    color: '#F0F0F0',
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
  },
  termsText: {
    color: '#555555',
    fontSize: 12,
    textAlign: 'center',
  },

  // ── Shared ────────────────────────────────────────────────────────────────────
  kvRoot: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 24,
  },
  backBtn: {
    marginBottom: 32,
    marginTop: 16,
  },
  backArrow: {
    color: '#00FF87',
    fontSize: 24,
  },
  screenTitle: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#F0F0F0',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    marginBottom: 40,
  },
  signupSubtitle: {
    marginBottom: 32,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#8A8A8A',
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 18,
    color: '#F0F0F0',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 58,
  },
  fieldMargin: {
    marginBottom: 20,
  },
  passwordRow: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  passwordInput: {
    flex: 1,
    color: '#F0F0F0',
    fontSize: 16,
  },
  showHideText: {
    color: '#00FF87',
    fontSize: 14,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotText: {
    color: '#00FF87',
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: '#00FF87',
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: '#000000',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
  },
  signupSubmitBtn: {
    marginTop: 8,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  errorBannerText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  dividerContainer: {
    marginTop: 32,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerLabelWrap: {
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 16,
  },
  dividerLabel: {
    color: '#555555',
    fontSize: 14,
  },
  socialBtn: {
    backgroundColor: '#141414',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialBtnMarginTop: {
    marginTop: 32,
  },
  socialBtnMarginTopSm: {
    marginTop: 12,
  },
  socialBtnText: {
    color: '#F0F0F0',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  signupSwitchRow: {
    marginTop: 24,
    marginBottom: 32,
  },
  switchText: {
    color: '#8A8A8A',
  },
  switchLink: {
    color: '#00FF87',
    fontFamily: 'SpaceGrotesk-Bold',
  },

  // ── Sign Up role cards ────────────────────────────────────────────────────────
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderWidth: 2,
    borderColor: '#00FF87',
    backgroundColor: 'rgba(0,255,135,0.06)',
  },
  roleCardUnselected: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  roleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#F0F0F0',
  },
  roleSubtitle: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 4,
  },
});
