import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const ROLE_OPTIONS = ['Bartender', 'Server', 'Cook', 'Event Staff', 'Security', 'Barback', 'Host'];

export default function WaitlistScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !role) {
      setError('Please fill in all fields and select a role.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('https://u8y8kzvzgndjkymacqmf8v9manbx8fwa.app.specular.dev/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), role }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error('Failed');
      }
      setSubmitted(true);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRolePress = (r: string) => {
    setRole(r);
  };

  if (submitted) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.successContainer}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.successHeadline}>You're on the list!</Text>
          <Text style={styles.successBody}>
            We'll text you when On The Fly launches in Kansas City. Get ready to earn.
          </Text>
          <Text style={styles.successWelcome}>{`Welcome, ${name} 👋`}</Text>
          <View style={styles.rolePillSuccess}>
            <Text style={styles.rolePillSuccessText}>{role}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.locationPill}>
              <Text style={styles.locationPillText}>Kansas City • Now Hiring</Text>
            </View>
            <Text style={styles.headline}>{'Get Paid on\nYour Schedule'}</Text>
            <Text style={styles.subheadline}>
              Pick up bartending, serving, and event shifts when you want them
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#8A8A8A"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor="#8A8A8A"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#8A8A8A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />

            {/* Role picker */}
            <Text style={styles.roleLabel}>What do you do?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roleScroll}
            >
              {ROLE_OPTIONS.map((r) => {
                const isSelected = role === r;
                const pillBg = isSelected ? '#00FF87' : 'rgba(255,255,255,0.06)';
                const pillText = isSelected ? '#0A0A0A' : '#F0F0F0';
                return (
                  <AnimatedPressable
                    key={r}
                    onPress={() => handleRolePress(r)}
                    style={[styles.rolePill, { backgroundColor: pillBg }]}
                  >
                    <Text style={[styles.rolePillText, { color: pillText }]}>{r}</Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Submit */}
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#0A0A0A" />
              ) : (
                <Text style={styles.submitButtonText}>Join the Waitlist</Text>
              )}
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  locationPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,255,135,0.12)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.25)',
  },
  locationPillText: {
    color: '#00FF87',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.3,
  },
  headline: {
    color: '#F0F0F0',
    fontSize: 42,
    fontFamily: 'SpaceGrotesk-Bold',
    lineHeight: 50,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  subheadline: {
    color: '#8A8A8A',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 26,
  },
  form: {
    paddingHorizontal: 24,
    gap: 12,
  },
  input: {
    backgroundColor: '#141414',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#F0F0F0',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
  },
  roleLabel: {
    color: '#8A8A8A',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 4,
  },
  roleScroll: {
    gap: 8,
    paddingRight: 8,
  },
  rolePill: {
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  rolePillText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#00FF87',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0A0A0A',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.2,
  },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,255,135,0.15)',
    borderWidth: 2,
    borderColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkMark: {
    color: '#00FF87',
    fontSize: 36,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  successHeadline: {
    color: '#F0F0F0',
    fontSize: 34,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  successBody: {
    color: '#8A8A8A',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  successWelcome: {
    color: '#F0F0F0',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    marginTop: 4,
  },
  rolePillSuccess: {
    backgroundColor: 'rgba(0,255,135,0.12)',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.3)',
    marginTop: 4,
  },
  rolePillSuccessText: {
    color: '#00FF87',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
  },
});
