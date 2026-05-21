import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { apiPatch } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useRole } from '@/contexts/RoleContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function LegalScreen() {
  const [agreedContractor, setAgreedContractor] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentRole } = useRole();
  const canContinue = agreedContractor && agreedTerms;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      await apiPatch('/api/me', {
        agreed_to_terms: true,
        agreed_at: new Date().toISOString(),
      });
      if (currentRole === 'manager') {
        router.push('/onboarding/manager/complete');
      } else {
        router.push('/onboarding/worker/complete');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not save your agreement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContractor = () => {
    setAgreedContractor(!agreedContractor);
  };

  const handleToggleTerms = () => {
    setAgreedTerms(!agreedTerms);
  };

  const buttonShadow = canContinue && !loading
    ? Platform.select({
        web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' } as object,
        default: {
          shadowColor: '#00FF87',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
          elevation: 10,
        },
      })
    : {};

  const buttonBg = canContinue ? COLORS.primary : 'rgba(255,255,255,0.08)';
  const buttonTextColor = canContinue ? '#000' : COLORS.textTertiary;
  const buttonLabel = loading ? 'Saving...' : 'I Agree & Continue';

  const cardStyle = {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 11,
            fontFamily: 'SpaceGrotesk-SemiBold',
            letterSpacing: 1.5,
            marginBottom: 8,
          }}
        >
          LEGAL AGREEMENT
        </Text>
        <Text
          style={{
            color: COLORS.text,
            fontSize: 26,
            fontFamily: 'SpaceGrotesk-Bold',
            fontWeight: '800',
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          Before You Continue
        </Text>
        <Text
          style={{
            color: COLORS.textSecondary,
            fontSize: 14,
            fontFamily: 'SpaceGrotesk-Regular',
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          Please read and agree to the following before using On the Fly.
        </Text>

        {/* Section 1 — Independent Contractor Agreement */}
        <View style={[cardStyle, { marginBottom: 16 }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.accent,
              }}
            />
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
                fontFamily: 'SpaceGrotesk-Bold',
              }}
            >
              Independent Contractor Agreement
            </Text>
          </View>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              fontFamily: 'SpaceGrotesk-Regular',
              lineHeight: 22,
            }}
          >
            {`By using On the Fly, you acknowledge and agree that:\n\n• You are an independent contractor, not an employee of On the Fly or any venue you work at through this platform.\n\n• You are responsible for your own taxes, including self-employment tax (1099 contractor status). On the Fly does not withhold taxes on your behalf.\n\n• You are solely responsible for your conduct, actions, and performance at any venue or job site. On the Fly bears no liability for any incidents, injuries, damages, or disputes arising from your work at any venue.\n\n• You are responsible for maintaining any licenses, certifications, or permits required for your role (e.g. TIPS certification for bartenders).\n\n• On the Fly acts solely as a marketplace connecting workers with venues and assumes no employer-employee relationship with any worker.`}
          </Text>
        </View>

        {/* Section 2 — Terms of Service */}
        <View style={[cardStyle, { marginBottom: 24 }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.primary,
              }}
            />
            <Text
              style={{
                color: COLORS.text,
                fontSize: 15,
                fontFamily: 'SpaceGrotesk-Bold',
              }}
            >
              Terms of Service
            </Text>
          </View>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              fontFamily: 'SpaceGrotesk-Regular',
              lineHeight: 22,
            }}
          >
            {`By using On the Fly, you agree to the following terms:\n\n• On the Fly is a technology platform that connects hospitality workers with venues and managers seeking temporary staffing. We are not a staffing agency or employer.\n\n• On the Fly holds no liability for incidents, injuries, property damage, theft, or disputes that occur at job sites. All liability rests with the worker and the venue.\n\n• Workers and managers are responsible for ensuring all work arrangements comply with applicable local, state, and federal laws.\n\n• On the Fly reserves the right to suspend or remove any user who violates platform policies, engages in fraudulent activity, or receives repeated negative reviews.\n\n• Payments are processed through the platform. On the Fly charges a service fee on each transaction. Rates are disclosed at the time of booking.\n\n• By continuing, you confirm you are at least 18 years of age and legally authorized to work in the United States.`}
          </Text>
        </View>

        {/* Checkbox 1 — Independent Contractor */}
        <AnimatedPressable
          onPress={handleToggleContractor}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: agreedContractor ? COLORS.primary : 'rgba(255,255,255,0.2)',
              backgroundColor: agreedContractor ? COLORS.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {agreedContractor ? <MaterialIcons name="check" size={14} color="#000" /> : null}
          </View>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 13,
              fontFamily: 'SpaceGrotesk-Regular',
              flex: 1,
              lineHeight: 20,
            }}
          >
            I have read and agree to the Independent Contractor Agreement. I understand I am a 1099 contractor and On the Fly is not liable for my actions at any venue.
          </Text>
        </AnimatedPressable>

        {/* Checkbox 2 — Terms of Service */}
        <AnimatedPressable
          onPress={handleToggleTerms}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: agreedTerms ? COLORS.primary : 'rgba(255,255,255,0.2)',
              backgroundColor: agreedTerms ? COLORS.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {agreedTerms ? <MaterialIcons name="check" size={14} color="#000" /> : null}
          </View>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 13,
              fontFamily: 'SpaceGrotesk-Regular',
              flex: 1,
              lineHeight: 20,
            }}
          >
            I have read and agree to the Terms of Service. I understand On the Fly is a platform and holds no liability for incidents at job sites.
          </Text>
        </AnimatedPressable>

        {/* Continue Button */}
        <AnimatedPressable
          onPress={handleContinue}
          disabled={!canContinue || loading}
        >
          <View
            style={[
              {
                backgroundColor: buttonBg,
                borderRadius: 16,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              },
              buttonShadow,
            ]}
          >
            <Text
              style={{
                color: buttonTextColor,
                fontSize: 16,
                fontFamily: 'SpaceGrotesk-Bold',
              }}
            >
              {buttonLabel}
            </Text>
            {!loading && canContinue ? <MaterialIcons name="arrow-forward" size={18} color="#000" /> : null}
          </View>
        </AnimatedPressable>
      </ScrollView>
    </>
  );
}
