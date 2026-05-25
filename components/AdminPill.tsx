import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { apiPost } from '@/utils/api';

export function AdminPill() {
  const { isAdmin, user, signOut } = useAuth();
  const { currentRole, realRole, adminOverrideRole, isOverriding, setAdminOverrideRole } = useRole();
  const [modalVisible, setModalVisible] = useState(false);

  // Only render for admin users
  if (!isAdmin) return null;

  const handlePillTap = async () => {
    // Toggle between worker and manager
    const next = currentRole === 'worker' ? 'manager' : 'worker';
    console.log('[Admin] Role override set:', next);
    await setAdminOverrideRole(next);
  };

  const handleLongPress = () => {
    setModalVisible(true);
  };

  const handleSwitchWorker = async () => {
    console.log('[Admin] Role override set: worker');
    await setAdminOverrideRole('worker');
    setModalVisible(false);
  };

  const handleSwitchManager = async () => {
    console.log('[Admin] Role override set: manager');
    await setAdminOverrideRole('manager');
    setModalVisible(false);
  };

  const handleResetRole = async () => {
    console.log('[Admin] Role override set: null (reset to real role)');
    await setAdminOverrideRole(null);
    setModalVisible(false);
  };

  const handleForceCompleteOnboarding = async () => {
    setModalVisible(false);
    try {
      await apiPost('/api/admin/force-complete-onboarding', {});
      Alert.alert('Done', 'Onboarding marked complete. Restart the app to see the effect.');
    } catch (err) {
      Alert.alert('Error', 'Could not force-complete onboarding: ' + String(err));
    }
  };

  const handleClearAndSignOut = async () => {
    setModalVisible(false);
    try {
      // Clear SecureStore
      const keysToDelete = ['admin_override_role', 'better-auth-token', 'auth_token'];
      for (const key of keysToDelete) {
        try { await SecureStore.deleteItemAsync(key); } catch {}
      }
    } catch {}
    await signOut();
  };

  const handleShowInfo = () => {
    Alert.alert(
      'Admin Info',
      [
        `Email: ${user?.email ?? 'none'}`,
        `Real role: ${realRole ?? 'none'}`,
        `Current role: ${currentRole ?? 'none'}`,
        `Override: ${adminOverrideRole ?? 'none'}`,
        `isOverriding: ${isOverriding}`,
        `isAdmin: ${isAdmin}`,
      ].join('\n')
    );
  };

  const pillLabel = currentRole === 'worker' ? '⇄ Worker' : '⇄ Manager';

  const pillGlow = Platform.select({
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
    web: { boxShadow: '0 0 18px rgba(0,255,135,0.4)' } as any,
  }) ?? {};

  return (
    <>
      <Pressable
        onPress={handlePillTap}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[styles.pill, pillGlow]}
      >
        <Text style={styles.pillText}>{pillLabel}</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Admin God Mode</Text>
            <Text style={styles.sheetSubtitle}>
              {user?.email ?? ''} {isOverriding ? `• Overriding as ${currentRole}` : `• Real role: ${realRole}`}
            </Text>

            <Pressable style={styles.action} onPress={handleSwitchWorker}>
              <Text style={styles.actionIcon}>👷</Text>
              <Text style={[styles.actionText, currentRole === 'worker' && styles.actionTextActive]}>
                Switch to Worker view
              </Text>
              {currentRole === 'worker' && <Text style={styles.check}>✓</Text>}
            </Pressable>

            <Pressable style={styles.action} onPress={handleSwitchManager}>
              <Text style={styles.actionIcon}>🏢</Text>
              <Text style={[styles.actionText, currentRole === 'manager' && styles.actionTextActive]}>
                Switch to Manager view
              </Text>
              {currentRole === 'manager' && <Text style={styles.check}>✓</Text>}
            </Pressable>

            <Pressable style={styles.action} onPress={handleResetRole}>
              <Text style={styles.actionIcon}>↩</Text>
              <Text style={styles.actionText}>
                Reset to real role ({realRole ?? 'none'})
              </Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.action} onPress={handleForceCompleteOnboarding}>
              <Text style={styles.actionIcon}>✅</Text>
              <Text style={styles.actionText}>Force-complete onboarding</Text>
            </Pressable>

            <Pressable style={styles.action} onPress={handleShowInfo}>
              <Text style={styles.actionIcon}>ℹ️</Text>
              <Text style={styles.actionText}>Show current user info</Text>
            </Pressable>

            <Pressable style={[styles.action, styles.actionDanger]} onPress={handleClearAndSignOut}>
              <Text style={styles.actionIcon}>🗑</Text>
              <Text style={[styles.actionText, styles.actionTextDanger]}>
                Clear all local data + sign out
              </Text>
            </Pressable>

            <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 9999,
  },
  pillText: {
    color: COLORS.background,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: COLORS.primary,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    marginBottom: 20,
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionDanger: {
    borderBottomColor: 'transparent',
  },
  actionIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  actionText: {
    flex: 1,
    color: COLORS.text,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
  },
  actionTextActive: {
    color: COLORS.primary,
  },
  actionTextDanger: {
    color: COLORS.danger,
  },
  check: {
    color: COLORS.primary,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
  },
  divider: {
    height: 8,
  },

  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
  },
});
