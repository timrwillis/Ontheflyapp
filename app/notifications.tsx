import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { apiGet, apiPut } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  shift_id?: string;
  created_at: string;
}

const glass = {
  backgroundColor: 'rgba(255,255,255,0.04)' as const,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)' as const,
  borderRadius: 16,
  padding: 16,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getNotifIcon(type: string): { name: string; color: string } {
  switch (type) {
    case 'shift_application': return { name: 'person-add', color: COLORS.primary };
    case 'application_confirmed': return { name: 'check-circle', color: COLORS.primary };
    case 'application_rejected': return { name: 'cancel', color: COLORS.danger };
    case 'shift_reminder': return { name: 'alarm', color: COLORS.accent };
    case 'new_shift': return { name: 'bolt', color: COLORS.primary };
    default: return { name: 'notifications', color: COLORS.textSecondary };
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      console.log('[Notifications] Loading notifications...');
      const data = await apiGet<Notification[] | { notifications: Notification[] }>('/api/notifications');
      const list = Array.isArray(data) ? data : (data as any)?.notifications ?? [];
      setNotifications(list);
      console.log('[Notifications] Loaded', list.length, 'notifications');
    } catch (err) {
      console.error('[Notifications] Error loading:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const onRefresh = () => { setRefreshing(true); loadNotifications(); };

  const handleMarkRead = async (id: string) => {
    console.log('[Notifications] Marking notification read:', id);
    try {
      await apiPut(`/api/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('[Notifications] Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    console.log('[Notifications] Mark all read pressed');
    setMarkingAll(true);
    try {
      await apiPut('/api/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      console.log('[Notifications] All notifications marked read');
    } catch (err) {
      console.error('[Notifications] Error marking all read:', err);
      Alert.alert('Error', 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Stack.Screen options={{
        title: 'Notifications',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
        headerRight: () => unreadCount > 0 ? (
          <AnimatedPressable onPress={handleMarkAllRead} style={{ marginRight: 4 }}>
            <Text style={{ color: markingAll ? COLORS.textSecondary : COLORS.primary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {markingAll ? 'Marking...' : 'Mark all read'}
            </Text>
          </AnimatedPressable>
        ) : null,
      }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {unreadCount > 0 && (
          <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
            <Text style={{ color: COLORS.primary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
              {unreadCount}
              {' unread notification'}
              {unreadCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {loading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={{ ...glass, marginBottom: 10, height: 72, opacity: 0.5 }} />
          ))
        ) : notifications.length === 0 ? (
          <View style={{ ...glass, padding: 40, alignItems: 'center' }}>
            <MaterialIcons name="notifications-none" size={40} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ color: COLORS.text, fontSize: 16, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>
              No notifications yet
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
              You'll see shift updates and alerts here.
            </Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const icon = getNotifIcon(notif.type);
            const timeDisplay = timeAgo(notif.created_at);
            return (
              <AnimatedPressable
                key={notif.id}
                onPress={() => {
                  console.log('[Notifications] Notification tapped:', notif.id, notif.type);
                  if (!notif.read) handleMarkRead(notif.id);
                  if (notif.shift_id) router.push(`/shift/${notif.shift_id}`);
                }}
              >
                <View style={{
                  ...glass,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderLeftWidth: notif.read ? 1 : 3,
                  borderLeftColor: notif.read ? 'rgba(255,255,255,0.08)' : COLORS.primary,
                  backgroundColor: notif.read ? 'rgba(255,255,255,0.04)' : 'rgba(0,255,135,0.04)',
                }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <MaterialIcons name={icon.name as any} size={18} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', marginLeft: 8 }}>
                        {timeDisplay}
                      </Text>
                    </View>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', lineHeight: 18 }} numberOfLines={2}>
                      {notif.body}
                    </Text>
                  </View>
                  {!notif.read && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 }} />
                  )}
                </View>
              </AnimatedPressable>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
