import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { apiPost, apiGet } from '@/utils/api';
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
  web: { boxShadow: '0 0 24px rgba(0, 255, 135, 0.35)' },
  default: { shadowColor: '#00FF87', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
}) as object;

const CATEGORIES = ['account', 'shift', 'payment', 'technical', 'other'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

type Category = typeof CATEGORIES[number];
type Priority = typeof PRIORITIES[number];

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: COLORS.primary,
  in_progress: COLORS.accent,
  resolved: '#60A5FA',
  closed: COLORS.textSecondary,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: COLORS.textSecondary,
  medium: COLORS.accent,
  high: '#FF9500',
  urgent: COLORS.danger,
};

function SelectRow({ label, options, selected, onSelect }: {
  label: string;
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 10 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <AnimatedPressable key={opt} onPress={() => { console.log('[Support] Option selected:', label, opt); onSelect(opt); }}>
              <View style={{
                backgroundColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: isActive ? COLORS.primary : 'rgba(255,255,255,0.1)',
              }}>
                <Text style={{ color: isActive ? '#000' : COLORS.text, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold', textTransform: 'capitalize' }}>
                  {opt}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('account');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [showForm, setShowForm] = useState(true);

  const loadTickets = useCallback(async () => {
    try {
      console.log('[Support] Loading tickets...');
      const data = await apiGet<Ticket[] | { tickets: Ticket[] }>('/api/support/tickets/my');
      const list = Array.isArray(data) ? data : (data as any)?.tickets ?? [];
      setTickets(list);
      console.log('[Support] Loaded', list.length, 'tickets');
    } catch (err) {
      console.error('[Support] Error loading tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSubmit = async () => {
    console.log('[Support] Submit ticket pressed');
    if (!subject.trim()) { Alert.alert('Required', 'Please enter a subject.'); return; }
    if (!body.trim()) { Alert.alert('Required', 'Please describe your issue.'); return; }
    setLoading(true);
    try {
      const payload = { subject: subject.trim(), body: body.trim(), category, priority };
      console.log('[Support] Submitting ticket:', payload);
      await apiPost('/api/support/tickets', payload);
      console.log('[Support] Ticket submitted successfully');
      Alert.alert('Ticket Submitted', 'We\'ll get back to you as soon as possible.', [
        { text: 'OK', onPress: () => { setSubject(''); setBody(''); setShowForm(false); loadTickets(); } },
      ]);
    } catch (err) {
      console.error('[Support] Error submitting ticket:', err);
      Alert.alert('Error', 'Could not submit your ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{
        title: 'Support',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk-Bold' },
      }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {['New Ticket', 'My Tickets'].map((tab) => {
            const isActive = (tab === 'New Ticket') === showForm;
            return (
              <AnimatedPressable key={tab} onPress={() => { console.log('[Support] Tab switched:', tab); setShowForm(tab === 'New Ticket'); }} style={{ flex: 1 }}>
                <View style={{ backgroundColor: isActive ? COLORS.primary : 'transparent', borderRadius: 9, paddingVertical: 9, alignItems: 'center' }}>
                  <Text style={{ color: isActive ? '#000' : COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                    {tab}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {showForm ? (
          <>
            <View style={{ ...glass, marginBottom: 16 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 8 }}>
                SUBJECT
              </Text>
              <TextInput
                value={subject}
                onChangeText={(t) => { console.log('[Support] Subject changed'); setSubject(t); }}
                placeholder="Brief description of your issue"
                placeholderTextColor={COLORS.textTertiary}
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 12, color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 16 }}
              />
              <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk-SemiBold', letterSpacing: 1.5, marginBottom: 8 }}>
                DESCRIPTION
              </Text>
              <TextInput
                value={body}
                onChangeText={(t) => { console.log('[Support] Body changed'); setBody(t); }}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 12, color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-Regular', minHeight: 100, textAlignVertical: 'top' }}
              />
            </View>

            <View style={{ ...glass, marginBottom: 24 }}>
              <SelectRow label="Category" options={CATEGORIES} selected={category} onSelect={(v) => setCategory(v as Category)} />
              <SelectRow label="Priority" options={PRIORITIES} selected={priority} onSelect={(v) => setPriority(v as Priority)} />
            </View>

            <AnimatedPressable onPress={handleSubmit} disabled={loading}>
              <View style={{
                backgroundColor: loading ? 'rgba(0,255,135,0.5)' : COLORS.primary,
                borderRadius: 16,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                ...primaryGlow,
              }}>
                <MaterialIcons name="send" size={18} color="#000" />
                <Text style={{ color: '#000', fontSize: 16, fontFamily: 'SpaceGrotesk-Bold' }}>
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </View>
            </AnimatedPressable>
          </>
        ) : (
          <>
            <AnimatedPressable onPress={() => { console.log('[Support] New ticket button pressed'); setShowForm(true); }} style={{ marginBottom: 20 }}>
              <View style={{ ...glass, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}>
                <MaterialIcons name="add" size={18} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold' }}>
                  Submit New Ticket
                </Text>
              </View>
            </AnimatedPressable>

            {ticketsLoading ? (
              [1, 2].map((i) => <View key={i} style={{ ...glass, marginBottom: 10, height: 80, opacity: 0.5 }} />)
            ) : tickets.length === 0 ? (
              <View style={{ ...glass, padding: 32, alignItems: 'center' }}>
                <MaterialIcons name="support-agent" size={36} color={COLORS.textSecondary} style={{ marginBottom: 10 }} />
                <Text style={{ color: COLORS.text, fontSize: 15, fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 4 }}>No tickets yet</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' }}>
                  Submit a ticket and we'll help you out.
                </Text>
              </View>
            ) : (
              tickets.map((ticket) => {
                const statusColor = STATUS_COLORS[ticket.status] ?? COLORS.textSecondary;
                const priorityColor = PRIORITY_COLORS[ticket.priority] ?? COLORS.textSecondary;
                return (
                  <View key={ticket.id} style={{ ...glass, marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, fontFamily: 'SpaceGrotesk-SemiBold', flex: 1 }} numberOfLines={1}>
                        {ticket.subject}
                      </Text>
                      <View style={{ backgroundColor: statusColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                        <Text style={{ color: statusColor, fontSize: 10, fontFamily: 'SpaceGrotesk-Bold', textTransform: 'uppercase' }}>
                          {ticket.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', textTransform: 'capitalize' }}>
                        {ticket.category}
                      </Text>
                      <Text style={{ color: priorityColor, fontSize: 12, fontFamily: 'SpaceGrotesk-SemiBold', textTransform: 'capitalize' }}>
                        {ticket.priority}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}
