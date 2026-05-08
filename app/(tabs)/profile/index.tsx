import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useRole, Role } from '@/contexts/RoleContext';
import { ReliabilityScore } from '@/components/ReliabilityScore';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CheckCircle, Edit, Shield, Building2, Star, Zap } from 'lucide-react-native';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function RoleSwitcher() {
  const { setRole, currentRole } = useRole();

  const handleSwitch = async (role: Role) => {
    console.log('[Profile] Switching role to:', role);
    await setRole(role);
  };

  const roles: { role: Role; label: string; icon: React.ReactNode }[] = [
    { role: 'manager', label: 'Manager', icon: <Building2 size={16} color={currentRole === 'manager' ? '#000' : COLORS.textSecondary} /> },
    { role: 'worker', label: 'Worker', icon: <Zap size={16} color={currentRole === 'worker' ? '#000' : COLORS.textSecondary} /> },
    { role: 'admin', label: 'Admin', icon: <Shield size={16} color={currentRole === 'admin' ? '#000' : COLORS.textSecondary} /> },
  ];

  return (
    <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 12 }}>
        SWITCH ROLE (DEMO)
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {roles.map(({ role, label, icon }) => {
          const isActive = currentRole === role;
          return (
            <AnimatedPressable key={role} onPress={() => handleSwitch(role)} style={{ flex: 1 }}>
              <View style={{ backgroundColor: isActive ? COLORS.primary : COLORS.surfaceSecondary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: isActive ? COLORS.primary : COLORS.border }}>
                {icon}
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

function WorkerProfile() {
  const { currentUser, workerProfile } = useRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const name = workerProfile?.name ?? currentUser?.name ?? 'Worker';
  const initials = getInitials(name);
  const roles = workerProfile?.roles ?? [];
  const score = workerProfile?.reliability_score ?? 0;
  const certs = workerProfile?.certifications ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primaryMuted, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ color: COLORS.primary, fontSize: 32, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{initials}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold' }}>{name}</Text>
          {workerProfile?.is_verified && <CheckCircle size={18} color={COLORS.primary} fill={COLORS.primary} />}
        </View>
        {workerProfile?.city && (
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 12 }}>{workerProfile.city}</Text>
        )}
        {/* Role chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {roles.map((role) => (
            <View key={role} style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{role}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Reliability score */}
      <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <ReliabilityScore score={score} size={80} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 }}>Reliability Score</Text>
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{score}/100</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', marginTop: 4 }}>
            {score >= 80 ? 'Excellent standing' : score >= 60 ? 'Good standing' : 'Needs improvement'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Completed', value: workerProfile?.completed_shifts ?? 0 },
          { label: 'Avg Rating', value: workerProfile?.avg_rating ? Number(workerProfile.avg_rating).toFixed(1) : '—' },
          { label: 'Cancellations', value: workerProfile?.cancellations ?? 0 },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}>
            <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{stat.value}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center', marginTop: 4 }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Bio */}
      {workerProfile?.bio && (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 8 }}>BIO</Text>
          <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 22 }}>{workerProfile.bio}</Text>
        </View>
      )}

      {/* Certifications */}
      {certs.length > 0 && (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 10 }}>CERTIFICATIONS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {certs.map((cert) => (
              <View key={cert} style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
                <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Edit profile button */}
      <AnimatedPressable onPress={() => { console.log('[Profile] Edit profile pressed'); router.push('/edit-profile'); }}>
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 }}>
          <Edit size={18} color={COLORS.primary} />
          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>Edit Profile</Text>
        </View>
      </AnimatedPressable>

      <RoleSwitcher />
    </ScrollView>
  );
}

function ManagerProfile() {
  const { currentUser } = useRole();
  const insets = useSafeAreaInsets();
  const name = currentUser?.name ?? 'Manager';
  const initials = getInitials(name);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.accentMuted, borderWidth: 3, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ color: COLORS.accent, fontSize: 32, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{initials}</Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }}>{name}</Text>
        {currentUser?.business_name && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{currentUser.business_name}</Text>
          </View>
        )}
        {currentUser?.business_type && (
          <View style={{ backgroundColor: COLORS.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 }}>
            <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {currentUser.business_type}
            </Text>
          </View>
        )}
      </View>

      {/* Info card */}
      <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 12 }}>ACCOUNT INFO</Text>
        {[
          { label: 'Email', value: currentUser?.email ?? '—' },
          { label: 'City', value: currentUser?.city ?? '—' },
          { label: 'Role', value: 'Manager' },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{item.label}</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }} numberOfLines={1}>{item.value}</Text>
          </View>
        ))}
      </View>

      <RoleSwitcher />
    </ScrollView>
  );
}

function AdminProfile() {
  const { currentUser } = useRole();
  const insets = useSafeAreaInsets();
  const name = currentUser?.name ?? 'Admin';
  const initials = getInitials(name);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.dangerMuted, borderWidth: 3, borderColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ color: COLORS.danger, fontSize: 32, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold' }}>{initials}</Text>
        </View>
        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 8 }}>{name}</Text>
        <View style={{ backgroundColor: COLORS.dangerMuted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Shield size={14} color={COLORS.danger} />
          <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 0.5 }}>ADMIN ACCESS</Text>
        </View>
      </View>

      <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1, marginBottom: 12 }}>ACCOUNT INFO</Text>
        {[
          { label: 'Email', value: currentUser?.email ?? '—' },
          { label: 'Role', value: 'Platform Admin' },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk-Regular' }}>{item.label}</Text>
            <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>{item.value}</Text>
          </View>
        ))}
      </View>

      <RoleSwitcher />
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const { currentRole } = useRole();

  if (currentRole === 'worker') return <WorkerProfile />;
  if (currentRole === 'manager') return <ManagerProfile />;
  if (currentRole === 'admin') return <AdminProfile />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.textSecondary, fontFamily: 'SpaceGrotesk-Regular' }}>Select a role to view profile</Text>
    </View>
  );
}
