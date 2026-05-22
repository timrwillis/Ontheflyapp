import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_MODE } from '@/constants/AdminMode';
import { COLORS } from '@/constants/Colors';
import { useRole } from '@/contexts/RoleContext';

export function AdminSwitcher() {
  const { currentRole, adminOverrideRole, demoDataActive, setAdminRole, setDemoDataActive } = useRole();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  if (!ADMIN_MODE) return null;

  const isWorker = currentRole === 'worker';

  const handleSelectRole = async (role: 'worker' | 'manager') => {
    await setAdminRole(role);
    setModalVisible(false);
  };

  const handleToggleDemo = async () => {
    await setDemoDataActive(!demoDataActive);
  };

  return (
    <>
      {/* Floating pill */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[styles.pill, { bottom: insets.bottom + 60 }]}
      >
        <Text style={styles.pillText}>
          {isWorker ? '👷 Worker' : '🏢 Manager'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {/* Switch modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} onPress={() => {}}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>Admin Demo Mode</Text>
            <Text style={styles.sheetSubtitle}>Switch views without logging out</Text>

            {/* Worker */}
            <Pressable
              onPress={() => handleSelectRole('worker')}
              style={[styles.card, currentRole === 'worker' && styles.cardSelected]}
            >
              <Text style={styles.cardEmoji}>👷</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Worker View</Text>
                <Text style={styles.cardDesc}>See the app as a hospitality worker</Text>
              </View>
              {currentRole === 'worker' && <Text style={styles.check}>✓</Text>}
            </Pressable>

            {/* Manager */}
            <Pressable
              onPress={() => handleSelectRole('manager')}
              style={[styles.card, currentRole === 'manager' && styles.cardSelected]}
            >
              <Text style={styles.cardEmoji}>🏢</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Manager View</Text>
                <Text style={styles.cardDesc}>See the app as a restaurant manager</Text>
              </View>
              {currentRole === 'manager' && <Text style={styles.check}>✓</Text>}
            </Pressable>

            {/* Demo data toggle */}
            <Pressable
              onPress={handleToggleDemo}
              style={[styles.card, demoDataActive && styles.cardDemoActive]}
            >
              <Text style={styles.cardEmoji}>🎭</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Demo Data</Text>
                <Text style={styles.cardDesc}>Show realistic KC demo data</Text>
              </View>
              <Text style={[styles.toggleLabel, { color: demoDataActive ? COLORS.primary : COLORS.textSecondary }]}>
                {demoDataActive ? 'ON' : 'OFF'}
              </Text>
            </Pressable>

            {/* Close */}
            <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
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
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -70 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 8,
    // Shadow
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: `0 4px 20px rgba(0,255,135,0.45)` } as any,
    }),
    zIndex: 9999,
  },
  pillText: {
    color: '#000',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
  },
  chevron: {
    color: '#000',
    fontSize: 12,
    lineHeight: 16,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
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
    color: COLORS.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: COLORS.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    marginBottom: 20,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  cardDemoActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    marginBottom: 2,
  },
  cardDesc: {
    color: COLORS.textSecondary,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
  },
  check: {
    color: COLORS.primary,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
  },
  toggleLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    minWidth: 28,
    textAlign: 'right',
  },

  closeBtn: {
    marginTop: 6,
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
