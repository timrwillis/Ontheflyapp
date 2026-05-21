import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Building2, MapPin, Users } from 'lucide-react-native';
import { WorkerCardSkeleton } from '@/components/SkeletonLoader';

interface Business {
  id: string;
  name: string;
  type?: string;
  city?: string;
  manager_name?: string;
  shift_count?: number;
  address?: string;
}

function BusinessCard({ business, index }: { business: Business; index: number }) {
  const typeColors: Record<string, { bg: string; text: string }> = {
    bar: { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
    restaurant: { bg: 'rgba(249, 115, 22, 0.15)', text: '#FB923C' },
    venue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  };
  const typeKey = business.type?.toLowerCase() ?? 'restaurant';
  const typeStyle = typeColors[typeKey] ?? typeColors['restaurant'];
  const typeLabel = business.type ? business.type.charAt(0).toUpperCase() + business.type.slice(1) : 'Venue';

  return (
    <AnimatedPressable onPress={() => {}}>
      <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12, ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.4)' } : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 }) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700', fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4 }} numberOfLines={1}>
              {business.name}
            </Text>
            {business.manager_name && (
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' }}>
                {business.manager_name}
              </Text>
            )}
          </View>
          <View style={{ backgroundColor: typeStyle.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: typeStyle.text, fontSize: 11, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{typeLabel}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          {business.city && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>{business.city}</Text>
            </View>
          )}
          {business.shift_count !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={13} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' }}>{business.shift_count} shifts</Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function BusinessesScreen() {
  const insets = useSafeAreaInsets();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBusinesses = useCallback(async () => {
    try {
      const data = await apiGet<Business[]>('/api/businesses');
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);

  const onRefresh = () => { setRefreshing(true); loadBusinesses(); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Building2 size={22} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: '800', fontFamily: 'SpaceGrotesk-Bold', letterSpacing: -0.5 }}>
          Businesses
        </Text>
        <View style={{ marginLeft: 'auto', backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold' }}>{businesses.length}</Text>
        </View>
      </View>

      {loading ? (
        <>
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
          <WorkerCardSkeleton />
        </>
      ) : businesses.length === 0 ? (
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Building2 size={28} color={COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'SpaceGrotesk-SemiBold', marginBottom: 6 }}>No businesses yet</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', fontFamily: 'SpaceGrotesk-Regular' }}>
            Businesses will appear here once they register.
          </Text>
        </View>
      ) : (
        businesses.map((biz, i) => (
          <BusinessCard key={biz.id} business={biz} index={i} />
        ))
      )}
    </ScrollView>
  );
}
