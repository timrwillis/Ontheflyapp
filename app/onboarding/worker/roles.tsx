import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { authenticatedPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

// Role list — keys preserved exactly, emojis replaced with line-icon descriptors
const ALL_ROLES = [
  { value: 'bartender',   label: 'Bartender',    lib: 'mci',      icon: 'glass-cocktail'       },
  { value: 'server',      label: 'Server',        lib: 'mci',      icon: 'silverware-fork-knife' },
  { value: 'cook',        label: 'Cook',          lib: 'mci',      icon: 'chef-hat'             },
  { value: 'busser',      label: 'Busser',        lib: 'mci',      icon: 'bowl-mix-outline'     },
  { value: 'barback',     label: 'Barback',       lib: 'mci',      icon: 'bottle-wine'          },
  { value: 'event_staff', label: 'Event Staff',   lib: 'ionicons', icon: 'people-outline'       },
  { value: 'security',    label: 'Security',      lib: 'ionicons', icon: 'shield-outline'       },
  { value: 'host',        label: 'Host/Hostess',  lib: 'feather',  icon: 'home'                 },
  { value: 'runner',      label: 'Runner',        lib: 'mci',      icon: 'run-fast'             },
  { value: 'line_cook',   label: 'Line Cook',     lib: 'mci',      icon: 'pot-steam-outline'    },
  { value: 'dishwasher',  label: 'Dishwasher',    lib: 'mci',      icon: 'dishwasher'           },
  { value: 'catering',    label: 'Catering',      lib: 'mci',      icon: 'silverware-variant'   },
] as const;

interface SelectedRole {
  role: string;
  yearsExperience: number;
  isPrimary: boolean;
}

const PADDING_H = 22;
const CARD_GAP = 10;

// Subtle glow on selected card — matches the platform glow pattern used across onboarding screens
const cardSelectedGlow = Platform.select({
  web: { boxShadow: '0 0 10px rgba(0, 255, 135, 0.25)' },
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
}) as object;

// Full glow for the active Continue button — same as profile.tsx / availability.tsx
const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: {
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
}) as object;

// Render the correct icon component based on the library tag
function RoleIcon({ lib, icon, color }: { lib: string; icon: string; color: string }) {
  if (lib === 'ionicons') {
    return <Ionicons name={icon as any} size={18} color={color} />;
  }
  if (lib === 'feather') {
    return <Feather name={icon as any} size={18} color={color} />;
  }
  return <MaterialCommunityIcons name={icon as any} size={18} color={color} />;
}

export default function WorkerRolesStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedRoles, setSelectedRoles] = useState<SelectedRole[]>([]);
  const [loading, setLoading] = useState(false);

  // Compute explicit pixel width so the 2-column layout is exact on every screen size.
  // Using percentages with `gap` in RN causes cards to shrink unpredictably on some
  // versions, which is what produced the "one letter per line" wrap bug.
  const cardWidth = (screenWidth - PADDING_H * 2 - CARD_GAP) / 2;

  // --- Logic preserved exactly ---
  const toggleRole = (roleValue: string) => {
    setSelectedRoles((prev) => {
      const exists = prev.find((r) => r.role === roleValue);
      if (exists) return prev.filter((r) => r.role !== roleValue);
      const isPrimary = prev.length === 0;
      return [...prev, { role: roleValue, yearsExperience: 1, isPrimary }];
    });
  };

  const setYears = (roleValue: string, years: number) => {
    setSelectedRoles((prev) =>
      prev.map((r) => (r.role === roleValue ? { ...r, yearsExperience: years } : r))
    );
  };

  const setPrimary = (roleValue: string) => {
    setSelectedRoles((prev) =>
      prev.map((r) => ({ ...r, isPrimary: r.role === roleValue }))
    );
  };

  const handleNext = async () => {
    if (selectedRoles.length === 0) {
      Alert.alert('Required', 'Please select at least one role.');
      return;
    }
    setLoading(true);
    try {
      await authenticatedPost('/api/onboarding/worker/roles', { roles: selectedRoles });
      router.push('/onboarding/worker/availability');
    } catch (err) {
      console.error('[WorkerOnboarding] Roles save failed:', err);
      Alert.alert('Error', 'Could not save your roles. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  // --- End preserved logic ---

  const canContinue = selectedRoles.length > 0 && !loading;

  // Pair roles into explicit 2-column rows — the most reliable approach in RN
  const rows: (typeof ALL_ROLES[number])[][] = [];
  for (let i = 0; i < ALL_ROLES.length; i += 2) {
    rows.push(ALL_ROLES.slice(i, i + 2) as any);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingHorizontal: PADDING_H,
        paddingBottom: 60,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress bar — step 2 of 4 active */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= 1 ? COLORS.primary : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </View>

      {/* Header — matches step label + h1 pattern from profile.tsx and availability.tsx */}
      <Text style={{
        color: COLORS.textSecondary,
        fontSize: 11,
        fontFamily: 'SpaceGrotesk-SemiBold',
        letterSpacing: 1.5,
        marginBottom: 6,
      }}>
        STEP 2 OF 4
      </Text>
      <Text style={{
        color: COLORS.text,
        fontSize: 26,
        fontWeight: '800',
        fontFamily: 'SpaceGrotesk-Bold',
        letterSpacing: -0.5,
        marginBottom: 6,
      }}>
        Your Roles
      </Text>
      <Text style={{
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'SpaceGrotesk-Regular',
        marginBottom: 28,
        lineHeight: 22,
      }}>
        Select every position you're qualified to work. You can update this later.
      </Text>

      {/* Role grid */}
      <View style={{ gap: CARD_GAP, marginBottom: 20 }}>
        {rows.map((pair, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: CARD_GAP }}>
            {pair.map((r) => {
              const isSelected = Boolean(selectedRoles.find((s) => s.role === r.value));
              return (
                <AnimatedPressable
                  key={r.value}
                  onPress={() => toggleRole(r.value)}
                  scaleValue={0.985}
                >
                  <View
                    style={{
                      width: cardWidth,
                      height: 120,
                      backgroundColor: isSelected ? 'rgba(0,255,135,0.10)' : COLORS.surface,
                      borderRadius: 14,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      padding: 14,
                      ...(isSelected ? cardSelectedGlow : {}),
                    }}
                  >
                    {/* Icon tile — top-left, 34×34, replaces emoji */}
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: isSelected ? COLORS.primary : COLORS.surface2,
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: COLORS.borderStrong,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <RoleIcon
                        lib={r.lib}
                        icon={r.icon}
                        color={isSelected ? COLORS.background : COLORS.textDim}
                      />
                    </View>

                    {/* Check indicator — top-right, 22px circle */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: isSelected ? COLORS.primary : 'transparent',
                        borderWidth: isSelected ? 0 : 1.5,
                        borderColor: 'rgba(255,255,255,0.25)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <MaterialIcons name="check" size={12} color={COLORS.background} />
                      )}
                    </View>

                    {/* Role label — pinned to card bottom, single horizontal line */}
                    <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: COLORS.text,
                          fontSize: 15,
                          fontFamily: 'SpaceGrotesk-SemiBold',
                        }}
                      >
                        {r.label}
                      </Text>
                    </View>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selection count — uppercase, dim, letterSpacing 1 */}
      <Text
        style={{
          color: COLORS.textSecondary,
          fontSize: 11,
          fontFamily: 'SpaceGrotesk-SemiBold',
          textAlign: 'center',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 16,
          minHeight: 18,
        }}
      >
        {selectedRoles.length > 0
          ? `${selectedRoles.length} role${selectedRoles.length === 1 ? '' : 's'} selected`
          : ''}
      </Text>

      {/* Continue button — disabled until a role is selected, matches other onboarding screens */}
      <AnimatedPressable onPress={handleNext} disabled={!canContinue}>
        <View
          style={{
            backgroundColor: canContinue ? COLORS.primary : COLORS.surface,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            ...(canContinue ? primaryGlow : {}),
          }}
        >
          <Text
            style={{
              color: canContinue ? COLORS.background : COLORS.textTertiary,
              fontSize: 17,
              fontFamily: 'SpaceGrotesk-Bold',
            }}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Text>
          {canContinue && !loading && (
            <MaterialIcons name="arrow-forward" size={18} color={COLORS.background} />
          )}
        </View>
      </AnimatedPressable>
    </ScrollView>
  );
}
