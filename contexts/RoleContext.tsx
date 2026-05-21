import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/utils/api';
import { authClient } from '@/lib/auth';

export type Role = 'manager' | 'worker' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  business_id?: string;
  business_name?: string;
  business_type?: string;
  city?: string;
  onboarding_step?: number;
  profile_completed?: boolean;
  notification_preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  shift_alerts?: boolean;
  application_updates?: boolean;
  reminders?: boolean;
  marketing?: boolean;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  user_id?: string;
  name: string;
  phone?: string;
  city?: string;
  roles?: string[];
  worker_roles?: { role: string; years_experience?: number; is_primary?: boolean }[];
  reliabilityScore?: number;
  reliability_score?: number;
  isAvailable?: boolean;
  is_available?: boolean;
  bio?: string;
  yearsExperience?: number;
  certifications?: string[];
  hasTransportation?: boolean;
  has_transportation?: boolean;
  preferredRadiusMiles?: number;
  preferred_radius_miles?: number;
  completedShifts?: number;
  avgRating?: number;
  avg_rating?: number;
  cancellations?: number;
  isVerified?: boolean;
  is_verified?: boolean;
  isSuspended?: boolean;
  is_suspended?: boolean;
  photoUrl?: string;
  onboarding_completed?: boolean;
  availability_days?: string[];
  availability_start?: string;
  availability_end?: string;
}

export interface OnboardingStatus {
  onboarding_completed: boolean;
  profile_completed: boolean;
  onboarding_step: string | null;
  role?: string | null;
  worker_profile?: WorkerProfile | null;
  manager_profile?: Record<string, unknown> | null;
  business?: Record<string, unknown> | null;
}

interface RoleContextType {
  currentRole: Role;
  currentUser: User | null;
  workerProfile: WorkerProfile | null;
  isLoading: boolean;
  onboardingStatus: OnboardingStatus | null;
  notificationPreferences: NotificationPreferences;
  setRole: (role: Role) => Promise<void>;
  refreshWorkerProfile: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<OnboardingStatus | null>;
  setCurrentUser: (user: User | null) => void;
}

const RoleContext = createContext<RoleContextType>({
  currentRole: null,
  currentUser: null,
  workerProfile: null,
  isLoading: true,
  onboardingStatus: null,
  notificationPreferences: {},
  setRole: async () => {},
  refreshWorkerProfile: async () => {},
  refreshOnboardingStatus: async () => null,
  setCurrentUser: () => {},
});

const ROLE_STORAGE_KEY = '@onthefly_role';

function normalizeWorkerProfile(raw: Record<string, unknown>): WorkerProfile {
  return {
    id: String(raw.id ?? ''),
    userId: String(raw.user_id ?? raw.userId ?? ''),
    user_id: String(raw.user_id ?? ''),
    name: String(raw.name ?? ''),
    phone: raw.phone as string | undefined,
    city: raw.city as string | undefined,
    roles: (raw.roles as string[] | undefined) ?? (raw.worker_roles as { role: string }[] | undefined)?.map((r) => r.role),
    worker_roles: raw.worker_roles as WorkerProfile['worker_roles'],
    reliabilityScore: Number(raw.reliability_score ?? raw.reliabilityScore ?? 0),
    reliability_score: Number(raw.reliability_score ?? 0),
    isAvailable: Boolean(raw.is_available ?? raw.isAvailable),
    is_available: Boolean(raw.is_available ?? false),
    bio: raw.bio as string | undefined,
    hasTransportation: Boolean(raw.has_transportation ?? raw.hasTransportation),
    has_transportation: Boolean(raw.has_transportation ?? false),
    preferredRadiusMiles: Number(raw.preferred_radius_miles ?? raw.preferredRadiusMiles ?? 0),
    preferred_radius_miles: Number(raw.preferred_radius_miles ?? 0),
    completedShifts: Number(raw.completed_shifts ?? raw.completedShifts ?? 0),
    avgRating: Number(raw.avg_rating ?? raw.avgRating ?? 0),
    avg_rating: Number(raw.avg_rating ?? 0),
    cancellations: Number(raw.cancellations ?? 0),
    isVerified: Boolean(raw.is_verified ?? raw.isVerified),
    is_verified: Boolean(raw.is_verified ?? false),
    isSuspended: Boolean(raw.is_suspended ?? raw.isSuspended),
    is_suspended: Boolean(raw.is_suspended ?? false),
    photoUrl: raw.photo_url as string | undefined,
    onboarding_completed: Boolean(raw.onboarding_completed),
    availability_days: raw.availability_days as string[] | undefined,
    availability_start: raw.availability_start as string | undefined,
    availability_end: raw.availability_end as string | undefined,
  };
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({});

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiGet<Record<string, unknown>>('/api/me');

      const user: User = {
        id: String(data.id ?? ''),
        name: String(data.name ?? ''),
        email: String(data.email ?? ''),
        role: String(data.role ?? ''),
        phone: data.phone as string | undefined,
        business_id: data.business_id as string | undefined,
        business_name: (data.business as Record<string, unknown>)?.name as string ?? (data.business_name as string | undefined),
        business_type: (data.business as Record<string, unknown>)?.type as string ?? (data.business_type as string | undefined),
        city: (data.worker_profile as Record<string, unknown>)?.city as string ?? (data.city as string | undefined),
        onboarding_step: data.onboarding_step != null ? Number(data.onboarding_step) : undefined,
        profile_completed: Boolean(data.profile_completed),
        notification_preferences: (data.notification_preferences as NotificationPreferences) ?? {},
      };
      setCurrentUser(user);
      setNotificationPreferences(user.notification_preferences ?? {});

      const role = user.role as Role;
      if (role && (role === 'manager' || role === 'worker' || role === 'admin')) {
        setCurrentRole(role);
        await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
      }

      if (role === 'worker' && data.worker_profile) {
        const wp = normalizeWorkerProfile(data.worker_profile as Record<string, unknown>);
        setWorkerProfile(wp);
      } else {
        setWorkerProfile(null);
      }

      return user;
    } catch {
      return null;
    }
  }, []);

  const refreshOnboardingStatus = useCallback(async () => {
    try {
      const data = await apiGet<OnboardingStatus>('/api/onboarding/status');
      setOnboardingStatus(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const refreshWorkerProfile = useCallback(async () => {
    try {
      const data = await apiGet<Record<string, unknown>>('/api/me');
      if (data.worker_profile) {
        const wp = normalizeWorkerProfile(data.worker_profile as Record<string, unknown>);
        setWorkerProfile(wp);
      }
    } catch {
      // silently fail — profile will be stale until next refresh
    }
  }, []);

  const setRole = useCallback(async (role: Role) => {
    setCurrentRole(role);
    if (role) {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      setCurrentUser(null);
      setWorkerProfile(null);
      setOnboardingStatus(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Check for an active auth session first — if none, skip fetchMe
        let session: Awaited<ReturnType<typeof authClient.getSession>> | null = null;
        try {
          session = await authClient.getSession();
        } catch {
          // getSession throws on web when no session exists — treat as no session
          setIsLoading(false);
          return;
        }
        if (!session?.data?.session) {
          setIsLoading(false);
          return;
        }

        const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
        if (stored && (stored === 'manager' || stored === 'worker' || stored === 'admin')) {
          setCurrentRole(stored as Role);
        }
        await fetchMe();
      } catch (err) {
        console.error('[RoleContext] Init error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchMe]);

  return (
    <RoleContext.Provider value={{
      currentRole,
      currentUser,
      workerProfile,
      isLoading,
      onboardingStatus,
      notificationPreferences,
      setRole,
      refreshWorkerProfile,
      refreshOnboardingStatus,
      setCurrentUser,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
