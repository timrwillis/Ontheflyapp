import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';
import { apiPut, apiDelete } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notificationPreferences, setRole, currentRole } = useRole();

  const [shiftAlerts, setShiftAlerts] = useState(notificationPreferences.shift_alerts !== false);
  const [appUpdates, setAppUpdates] = useState(notificationPreferences.application_updates !== false);
  const [reminders, setReminders] = useState(notificationPreferences.reminders !== false);
  const [marketing, setMarketing] = useState(notificationPreferences.marketing === true);
  const [saving, setSaving] = useState(false);

  const savePreferences = async (prefs: Record<string, boolean>) => {
    setSaving(true);
    try {
      await apiPut('/api/me', { notification_preferences: prefs });
    } catch (err) {
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string, value: boolean) => {
    const prefs = {
      shift_alerts: key === 'shift_alerts' ? value : shiftAlerts,
      application_updates: key === 'application_updates' ? value : appUpdates,
      reminders: key === 'reminders' ? value : reminders,
      marketing: key === 'marketing' ? value : marketing,
    };
    savePreferences(prefs);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete('/api/me');
            } catch (err) {
            }
            await setRole(null);
            router.replace('/');
          },
        },
      ]
    );
  };

  const notifToggles = [
    { key: 'shift_alerts', label: 'Shift Alerts', desc: 'New shifts matching your profile', value: shiftAlerts, setter: setShiftAlerts },
    { key: 'application_updates', label: 'Application Updates', desc: 'When managers respond to your applications', value: appUpdates, setter: setAppUpdates },
    { key: 'reminders', label: 'Reminders', desc: 'Shift reminders and check-in prompts', value: reminders, setter: setReminders },
    { key: 'marketing', label: 'Marketing', desc: 'Tips, promotions, and platform news', value: marketing, setter: setMarketing },
  ];

  return (
    <>
      <Stack.Screen options={{
        title: 'Settings',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
      }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          NOTIFICATIONS
        </Text>
        <View style={{ ...glass, marginBottom: 24 }}>
          {notifToggles.map((item, i) => (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < notifToggles.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 2 }}>
                  {item.label}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>
                  {item.desc}
                </Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={(v) => {
                  item.setter(v);
                  handleToggle(item.key, v);
                }}
                trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primaryMuted }}
                thumbColor={item.value ? COLORS.primary : COLORS.textSecondary}
                disabled={saving}
              />
            </View>
          ))}
        </View>

        {/* Legal */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          LEGAL
        </Text>
        <View style={{ ...glass, marginBottom: 24 }}>
          <AnimatedPressable onPress={() => { Alert.alert('Privacy Policy', 'Our privacy policy is available at onthefly.app/privacy'); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 }}>
              <MaterialIcons name="privacy-tip" size={18} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>Privacy Policy</Text>
              <MaterialIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => { Alert.alert('Terms of Service', 'Our terms of service are available at onthefly.app/terms'); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <MaterialIcons name="description" size={18} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>Terms of Service</Text>
              <MaterialIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Support */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          HELP
        </Text>
        <View style={{ ...glass, marginBottom: 24 }}>
          <AnimatedPressable onPress={() => { router.push('/support'); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <MaterialIcons name="support-agent" size={18} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>Contact Support</Text>
              <MaterialIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
            </View>
          </AnimatedPressable>
        </View>

        {/* Danger zone */}
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 12 }}>
          DANGER ZONE
        </Text>
        <View style={{ ...glass, borderColor: 'rgba(255,68,68,0.2)' }}>
          <AnimatedPressable onPress={handleDeleteAccount}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
              <MaterialIcons name="delete-forever" size={18} color={COLORS.danger} />
              <Text style={{ color: COLORS.danger, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }}>Delete Account</Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </>
  );
}
