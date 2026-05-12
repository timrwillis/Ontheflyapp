import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BETA_SEEN_KEY = 'onthefly_beta_seen';
const FEEDBACK_URL = 'https://forms.gle/barfly-beta';

export default function BetaWelcome() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleContinue = async () => {
    console.log('[BetaWelcome] Continue button pressed');
    try {
      await AsyncStorage.setItem(BETA_SEEN_KEY, 'true');
      console.log('[BetaWelcome] onthefly_beta_seen flag set in AsyncStorage');
    } catch (e) {
      console.warn('[BetaWelcome] Failed to set AsyncStorage flag:', e);
    }
    router.replace('/(tabs)');
  };

  const handleFeedback = () => {
    console.log('[BetaWelcome] Join Feedback Group button pressed, opening URL:', FEEDBACK_URL);
    Linking.openURL(FEEDBACK_URL);
  };

  const betaLabel = 'BETA v0.1';
  const betaBody = 'On The Fly is currently in active beta testing. Features and availability may evolve as we improve the experience.';

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View style={[styles.animatedWrapper, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top content */}
          <View style={styles.topSection}>
            {/* Radial glow */}
            <View style={styles.glowCircle} />

            {/* Logo */}
            <View style={styles.logoContainer}>
              <MaterialIcons name="bolt" size={48} color="#00FF87" style={styles.boltIcon} />
              <Text style={styles.logoText}>On The Fly</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Headline */}
            <Text style={styles.headline}>Welcome to the On The Fly Beta</Text>

            {/* Subheadline */}
            <Text style={styles.subheadline}>
              You're getting early access to the future of emergency hospitality staffing.
            </Text>

            {/* Glass card */}
            <View style={styles.glassCard}>
              <Text style={styles.betaLabel}>{betaLabel}</Text>
              <Text style={styles.betaBody}>{betaBody}</Text>
            </View>
          </View>

          {/* Bottom buttons */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonLabel}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleFeedback}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryButtonLabel}>Join Feedback Group</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  animatedWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },
  topSection: {
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 300,
    backgroundColor: 'rgba(0,255,135,0.06)',
    alignSelf: 'center',
    top: -80,
  },
  logoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  boltIcon: {
    shadowColor: '#00FF87',
    shadowRadius: 20,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
  },
  logoText: {
    color: '#00FF87',
    fontSize: 44,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: -1.5,
    shadowColor: '#00FF87',
    shadowRadius: 20,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(0,255,135,0.2)',
    marginVertical: 28,
  },
  headline: {
    color: '#F0F0F0',
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
  },
  subheadline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Regular',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    width: '100%',
  },
  betaLabel: {
    color: '#00FF87',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-SemiBold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  betaBody: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    lineHeight: 22,
  },
  buttonsSection: {
    width: '100%',
    marginTop: 40,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#00FF87',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF87',
    shadowRadius: 16,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  primaryButtonLabel: {
    color: '#0A0A0A',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    marginTop: 12,
    backgroundColor: 'rgba(0,255,135,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,135,0.25)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonLabel: {
    color: '#00FF87',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-SemiBold',
  },
});
