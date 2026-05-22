import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { authenticatedGet } from '@/utils/api';

type Screen = 'landing' | 'signin' | 'signup';
type Role = 'worker' | 'manager' | null;

const ND = Platform.OS !== 'web';

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
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const { setRole } = useRole();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>('landing');
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState('');

  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suShowPw, setSuShowPw] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState('');

  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && user) router.replace('/(tabs)/(home)');
  }, [user, loading]);

  const navigateTo = useCallback((next: Screen) => {
    const forward = next !== 'landing';
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: ND }),
      Animated.timing(slideX, { toValue: forward ? -28 : 28, duration: 130, useNativeDriver: ND }),
    ]).start(() => {
      setScreen(next);
      setSiError('');
      setSuError('');
      slideX.setValue(forward ? 28 : -28);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: ND }),
        Animated.timing(slideX, { toValue: 0, duration: 200, useNativeDriver: ND }),
      ]).start();
    });
  }, [fadeAnim, slideX]);

  const handleSignIn = async () => {
    console.log('[Auth] Sign In pressed', { email: siEmail.trim() });
    if (!siEmail.trim()) { setSiError('Please enter your email address.'); return; }
    if (!siPassword) { setSiError('Please enter your password.'); return; }
    setSiLoading(true);
    setSiError('');
    try {
      console.log('[Auth] Calling signInWithEmail...');
      await signInWithEmail(siEmail.trim(), siPassword);
      console.log('[Auth] Sign in succeeded, checking onboarding status...');

      try {
        const status = await authenticatedGet<{
          onboarding_completed: boolean;
          onboarding_step: string;
          role: string;
        }>('/api/onboarding/status');
        console.log('[Auth] Onboarding status:', JSON.stringify(status));

        if (status.onboarding_completed) {
          router.replace('/(tabs)/(home)');
        } else if (status.role === 'manager') {
          router.replace('/onboarding/manager/profile');
        } else {
          router.replace('/onboarding/worker');
        }
      } catch (statusErr) {
        console.error('[Auth] Onboarding status check failed:', statusErr);
        router.replace('/(tabs)/(home)');
      }
    } catch (err) {
      console.error('[Auth] Sign in error:', err);
      setSiError(err instanceof Error ? err.message : 'Please check your credentials and try again.');
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async () => {
    console.log('[Auth] Create Account pressed', { role: selectedRole, email: suEmail.trim() });
    if (!suName.trim()) { setSuError('Please enter your full name.'); return; }
    if (!suEmail.trim() || !suEmail.includes('@')) { setSuError('Please enter a valid email address.'); return; }
    if (suPassword.length < 8) { setSuError('Password must be at least 8 characters.'); return; }

    // Default to 'worker' if no role card was tapped
    const role: 'worker' | 'manager' = selectedRole ?? 'worker';

    setSuLoading(true);
    setSuError('');
    try {
      console.log('[Auth] Calling signUpWithEmail', { email: suEmail.trim(), name: suName.trim(), role });
      await signUpWithEmail(suEmail.trim(), suPassword, suName.trim());

      // Persist role so onboarding screens can read it
      await AsyncStorage.setItem('pendingRole', role);
      await setRole(role);

      console.log('[Auth] Sign up successful, navigating to onboarding for role:', role);
      if (role === 'manager') {
        router.replace('/onboarding/manager/profile');
      } else {
        router.replace('/onboarding/worker');
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string; error?: { message?: string } };
      const msg = errObj?.message || errObj?.error?.message || String(err);
      console.log('[Auth] Sign up error:', msg);
      setSuError(msg || 'Something went wrong. Please try again.');
    } finally {
      setSuLoading(false);
    }
  };

  const handleApple = async () => {
    setSocialLoading('apple');
    setSiError('');
    try {
      await signInWithApple();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apple sign in failed';
      if (!msg.toLowerCase().includes('cancel')) setSiError(msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = async () => {
    setSocialLoading('google');
    setSiError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      if (!msg.toLowerCase().includes('cancel')) setSiError(msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const isAnyLoading = siLoading || suLoading || !!socialLoading;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateX: slideX }] }]}>

        {/* ── LANDING ── */}
        {screen === 'landing' && (
          <View style={{ flex: 1 }}>
            <View style={[s.landingHero, { paddingTop: insets.top + 40 }]}>
              <Text style={s.lightning}>⚡</Text>
              <Text style={s.appName}>On The Fly</Text>
              <Text style={s.tagline}>Instant Coverage.</Text>
            </View>
            <View style={[s.landingBottom, { paddingBottom: insets.bottom + 40 }]}>
              <Pressable onPress={() => navigateTo('signup')}>
                <View style={s.primaryBtn}>
                  <Text style={s.primaryBtnText}>Get Started</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => navigateTo('signin')} style={{ marginTop: 12 }}>
                <View style={s.outlineBtn}>
                  <Text style={s.outlineBtnText}>Sign In</Text>
                </View>
              </Pressable>
              <Text style={s.termsText}>By continuing you agree to our Terms of Service</Text>
            </View>
          </View>
        )}

        {/* ── SIGN IN ── */}
        {screen === 'signin' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => navigateTo('landing')} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </Pressable>

            <Text style={s.title}>Welcome Back</Text>
            <Text style={[s.subtitle, { marginBottom: 40 }]}>Sign in to your account</Text>

            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#555"
              value={siEmail}
              onChangeText={setSiEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isAnyLoading}
            />

            <View style={{ height: 20 }} />

            <Text style={s.fieldLabel}>Password</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.inputInner}
                placeholder="Your password"
                placeholderTextColor="#555"
                value={siPassword}
                onChangeText={setSiPassword}
                secureTextEntry={!siShowPw}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                editable={!isAnyLoading}
              />
              <Pressable onPress={() => setSiShowPw(v => !v)} style={s.showHide}>
                <Text style={s.showHideText}>{siShowPw ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            {!!siError && (
              <View style={[s.errorBox, { marginTop: 16 }]}>
                <Text style={s.errorText}>{siError}</Text>
              </View>
            )}

            <Pressable onPress={handleSignIn} disabled={isAnyLoading} style={{ marginTop: 28 }}>
              <View style={[s.primaryBtn, isAnyLoading && s.disabled]}>
                {siLoading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.primaryBtnText}>Sign In</Text>}
              </View>
            </Pressable>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <View style={s.dividerLabelWrap}>
                <Text style={s.dividerLabel}>or</Text>
              </View>
            </View>

            <Pressable onPress={handleApple} disabled={isAnyLoading}>
              <View style={[s.socialBtn, isAnyLoading && s.disabled]}>
                {socialLoading === 'apple'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <AppleLogo size={20} color="#FFF" />
                      <Text style={s.socialBtnText}>Continue with Apple</Text>
                    </>}
              </View>
            </Pressable>

            <Pressable onPress={handleGoogle} disabled={isAnyLoading} style={{ marginTop: 12 }}>
              <View style={[s.socialBtn, isAnyLoading && s.disabled]}>
                {socialLoading === 'google'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <GoogleLogo size={20} />
                      <Text style={s.socialBtnText}>Continue with Google</Text>
                    </>}
              </View>
            </Pressable>

            <Text style={[s.switchLink, { marginTop: 28 }]}>
              Don't have an account?{' '}
              <Text style={s.switchLinkCta} onPress={() => navigateTo('signup')}>Sign up</Text>
            </Text>
          </ScrollView>
        )}

        {/* ── SIGN UP ── */}
        {screen === 'signup' && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={() => navigateTo('landing')} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </Pressable>

            <Text style={s.title}>Create Account</Text>
            <Text style={[s.subtitle, { marginBottom: 32 }]}>Join On the Fly today</Text>

            <View style={s.roleRow}>
              <Pressable onPress={() => setSelectedRole('worker')} style={{ flex: 1 }}>
                <View style={[s.roleCard, selectedRole === 'worker' ? s.roleCardSelected : s.roleCardUnselected]}>
                  <Text style={s.roleEmoji}>👷</Text>
                  <Text style={s.roleTitle}>Worker</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => setSelectedRole('manager')} style={{ flex: 1 }}>
                <View style={[s.roleCard, selectedRole === 'manager' ? s.roleCardSelected : s.roleCardUnselected]}>
                  <Text style={s.roleEmoji}>🏢</Text>
                  <Text style={s.roleTitle}>Manager</Text>
                </View>
              </Pressable>
            </View>

            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Alex Johnson"
              placeholderTextColor="#555"
              value={suName}
              onChangeText={setSuName}
              autoCapitalize="words"
              editable={!isAnyLoading}
            />

            <View style={{ height: 20 }} />

            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#555"
              value={suEmail}
              onChangeText={setSuEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isAnyLoading}
            />

            <View style={{ height: 20 }} />

            <Text style={s.fieldLabel}>Password</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.inputInner}
                placeholder="At least 8 characters"
                placeholderTextColor="#555"
                value={suPassword}
                onChangeText={setSuPassword}
                secureTextEntry={!suShowPw}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                editable={!isAnyLoading}
              />
              <Pressable onPress={() => setSuShowPw(v => !v)} style={s.showHide}>
                <Text style={s.showHideText}>{suShowPw ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            {!!suError && (
              <View style={[s.errorBox, { marginTop: 16 }]}>
                <Text style={s.errorText}>{suError}</Text>
              </View>
            )}

            <Pressable onPress={handleSignUp} disabled={isAnyLoading} style={{ marginTop: 28 }}>
              <View style={[s.primaryBtn, isAnyLoading && s.disabled]}>
                {suLoading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.primaryBtnText}>Create Account</Text>}
              </View>
            </Pressable>

            <Text style={[s.switchLink, { marginTop: 24 }]}>
              Already have an account?{' '}
              <Text style={s.switchLinkCta} onPress={() => navigateTo('signin')}>Sign in</Text>
            </Text>
          </ScrollView>
        )}

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Landing
  landingHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lightning: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    color: '#00FF87',
    fontSize: 44,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 8,
  },
  tagline: {
    color: '#8A8A8A',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  landingBottom: {
    paddingHorizontal: 24,
  },
  termsText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: '#00FF87',
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
  },
  outlineBtn: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
  },
  outlineBtnText: {
    color: '#F0F0F0',
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
  },
  disabled: {
    opacity: 0.55,
  },

  // Scroll screens
  scrollContent: {
    paddingHorizontal: 24,
  },
  backBtn: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backArrow: {
    color: '#00FF87',
    fontSize: 26,
  },

  // Titles
  title: {
    color: '#F0F0F0',
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#8A8A8A',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },

  // Form
  fieldLabel: {
    color: '#F0F0F0',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-SemiBold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 58,
    color: '#F0F0F0',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 58,
    paddingHorizontal: 18,
  },
  inputInner: {
    flex: 1,
    color: '#F0F0F0',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  showHide: {
    paddingLeft: 12,
  },
  showHideText: {
    color: '#8A8A8A',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
  },

  // Divider
  dividerRow: {
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#555',
    fontSize: 14,
  },

  // Social buttons
  socialBtn: {
    backgroundColor: '#141414',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialBtnText: {
    color: '#F0F0F0',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },

  // Links
  switchLink: {
    color: '#8A8A8A',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
  },
  switchLinkCta: {
    color: '#00FF87',
    fontFamily: 'SpaceGrotesk-SemiBold',
  },

  // Role cards
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
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
});
