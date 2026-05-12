import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole, Role } from '@/contexts/RoleContext';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

const primaryGlow = Platform.select({
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.3)' },
  default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
}) as object;

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getLevelInfo(completedShifts: number): { label: string; color: string; bg: string } {
  if (completedShifts >= 51) return { label: 'Level 4 · Elite', color: COLORS.accent, bg: COLORS.accentMuted };
  if (completedShifts >= 21) return { label: 'Level 3 · Pro', color: COLORS.primary, bg: COLORS.primaryMuted };
  if (completedShifts >= 6) return { label: 'Level 2 · Regular', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.12)' };
  return { label: 'Level 1 · Newcomer', color: COLORS.textSecondary, bg: 'rgba(138, 138, 138, 0.12)' };
}

function RoleSwitcher() {
  const { setRole, currentRole } = useRole();

  const handleSwitch = async (role: Role) => {
    console.log('[Profile] Switching role to:', role);
    await setRole(role);
  };

  const roles: { role: Role; label: string; iconName: 'business' | 'bolt' | 'shield' }[] = [
    { role: 'manager', label: 'Manager', iconName: 'business' },
    { role: 'worker', label: 'Worker', iconName: 'bolt' },
    { role: 'admin', label: 'Admin', iconName: 'shield' },
  ];

  return (
    <View style={{ ...glass, marginBottom: 20 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
        SWITCH ROLE (DEMO)
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {roles.map(({ role, label, iconName }) => {
          const isActive = currentRole === role;
          return (
            <AnimatedPressable key={role} onPress={() => handleSwitch(role)} style={{ flex: 1 }}>
              <View style={{
                backgroundColor: isActive ? COLORS.primary : COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: isActive ? COLORS.primary : COLORS.border,
              }}>
                <MaterialIcons name={iconName} size={16} color={isActive ? '#000' : COLORS.textSecondary} />
                <Text style={{ color: isActive ? '#000' : COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                  {label}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

function WorkerProfileView() {
  const { currentUser, workerProfile } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const name = workerProfile?.name ?? currentUser?.name ?? 'Worker';
  const initials = getInitials(name);
  const roles = workerProfile?.roles ?? [];
  const score = workerProfile?.reliabilityScore ?? 0;
  const certs = (workerProfile as any)?.certifications ?? [];

  const completedShifts = workerProfile?.completedShifts ?? 0;
  const avgRating = workerProfile?.avgRating ? Number(workerProfile.avgRating).toFixed(1) : '—';
  const cancellations = (workerProfile as any)?.cancellations ?? 0;

  const scoreColor = score >= 95 ? COLORS.primary : score >= 85 ? COLORS.accent : COLORS.danger;
  const scoreStanding = score >= 95 ? 'Top 5% of workers' : score >= 85 ? 'Good standing' : 'Building reputation';
  const scoreBarWidth = Math.min(100, Math.max(0, score));

  const levelInfo = getLevelInfo(completedShifts);
  const earningsEst = completedShifts * 6 * 28;
  const earningsDisplay = '$' + earningsEst.toLocaleString();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero section */}
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        {/* Avatar with glow ring */}
        <View style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: COLORS.primaryMuted,
          borderWidth: 3,
          borderColor: COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          ...primaryGlow,
        }}>
          <Text style={{ color: COLORS.primary, fontSize: 34, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            {initials}
          </Text>
        </View>

        {/* Name + verified */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold' }}>
            {name}
          </Text>
          {workerProfile?.isVerified && (
            <MaterialIcons name="verified" size={18} color={COLORS.primary} />
          )}
        </View>

        {/* Level badge */}
        <View style={{ backgroundColor: levelInfo.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10 }}>
          <Text style={{ color: levelInfo.color, fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            {levelInfo.label}
          </Text>
        </View>

        {/* City */}
        {workerProfile?.city && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            <MaterialIcons name="place" size={14} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>
              {workerProfile.city}
            </Text>
          </View>
        )}

        {/* Role chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {roles.map((role) => (
            <View key={role} style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                {role}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Reliability score card */}
      <View style={{ ...glass, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <ReliabilityScore score={score} size={80} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 }}>
            Reliability Score
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
            <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {score}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>
              /100
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ height: 3, backgroundColor: COLORS.surfaceSecondary, borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
            <View style={{ height: 3, width: `${scoreBarWidth}%`, backgroundColor: scoreColor, borderRadius: 2 }} />
          </View>
          <Text style={{ color: scoreColor, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
            {scoreStanding}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Completed', value: String(completedShifts) },
          { label: 'Avg Rating', value: String(avgRating) },
          { label: 'Cancellations', value: String(cancellations) },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, ...glass, alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
              {stat.value}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: 4 }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Earnings estimate card */}
      <View style={{ ...glass, marginBottom: 16 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 6 }}>
          Estimated Earnings
        </Text>
        <Text style={{ color: COLORS.accent, fontSize: 32, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -1, marginBottom: 4 }}>
          {earningsDisplay}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
          Based on {completedShifts} completed shifts
        </Text>
      </View>

      {/* Bio */}
      {(workerProfile as any)?.bio && (
        <View style={{ ...glass, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 8 }}>
            BIO
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>
            {(workerProfile as any).bio}
          </Text>
        </View>
      )}

      {/* Certifications */}
      {certs.length > 0 && (
        <View style={{ ...glass, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 10 }}>
            CERTIFICATIONS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {certs.map((cert: string) => (
              <View key={cert} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="star" size={12} color={COLORS.accent} />
                <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
                  {cert}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Edit profile */}
      <AnimatedPressable onPress={() => { console.log('[Profile] Edit profile pressed'); router.push('/edit-profile'); }}>
        <View style={{ ...glass, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          <MaterialIcons name="edit" size={18} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
            Edit Profile
          </Text>
        </View>
      </AnimatedPressable>

      <RoleSwitcher />
    </ScrollView>
  );
}

function ManagerProfileView() {
  const { currentUser } = useRole();
  const insets = useSafeAreaInsets();
  const name = currentUser?.name ?? 'Manager';
  const initials = getInitials(name);
  const email = currentUser?.email ?? '—';
  const city = (currentUser as any)?.city ?? '—';
  const businessName = (currentUser as any)?.business_name;
  const businessType = (currentUser as any)?.business_type;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{
          width: 92,
          height: 92,
          borderRadius: 46,
          backgroundColor: COLORS.accentMuted,
          borderWidth: 3,
          borderColor: COLORS.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Text style={{ color: COLORS.accent, fontSize: 34, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            {initials}
          </Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>
          {name}
        </Text>
        {businessName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialIcons name="business" size={14} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>
              {businessName}
            </Text>
          </View>
        )}
        {businessType && (
          <View style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {businessType}
            </Text>
          </View>
        )}
      </View>

      {/* Info card */}
      <View style={{ ...glass, marginBottom: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          ACCOUNT INFO
        </Text>
        {[
          { label: 'Email', value: email },
          { label: 'City', value: city },
          { label: 'Role', value: 'Manager' },
        ].map((item, i) => (
          <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: COLORS.divider }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>
              {item.label}
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <RoleSwitcher />
    </ScrollView>
  );
}

function AdminProfileView() {
  const { currentUser } = useRole();
  const insets = useSafeAreaInsets();
  const name = currentUser?.name ?? 'Admin';
  const initials = getInitials(name);
  const email = currentUser?.email ?? '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{
          width: 92,
          height: 92,
          borderRadius: 46,
          backgroundColor: COLORS.dangerMuted,
          borderWidth: 3,
          borderColor: COLORS.danger,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Text style={{ color: COLORS.danger, fontSize: 34, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>
            {initials}
          </Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 10 }}>
          {name}
        </Text>
        <View style={{ backgroundColor: COLORS.dangerMuted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="shield" size={14} color={COLORS.danger} />
          <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 0.5 }}>
            ADMIN ACCESS
          </Text>
        </View>
      </View>

      <View style={{ ...glass, marginBottom: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          ACCOUNT INFO
        </Text>
        {[
          { label: 'Email', value: email },
          { label: 'Role', value: 'Platform Admin' },
        ].map((item, i) => (
          <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < 1 ? 1 : 0, borderBottomColor: COLORS.divider }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>
              {item.label}
            </Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      <RoleSwitcher />
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const { currentRole } = useRole();

  if (currentRole === 'worker') return <WorkerProfileView />;
  if (currentRole === 'manager') return <ManagerProfileView />;
  if (currentRole === 'admin') return <AdminProfileView />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk-Regular' }}>
        Select a role to view profile
      </Text>
    </View>
  );
}
