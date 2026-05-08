import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/utils/api';

export type Role = 'manager' | 'worker' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  business_id?: string;
  business_name?: string;
  business_type?: string;
  city?: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  name: string;
  city?: string;
  roles?: string[];
  reliability_score?: number;
  is_available?: boolean;
  bio?: string;
  experience_years?: number;
  certifications?: string[];
  transportation?: boolean;
  completed_shifts?: number;
  avg_rating?: number;
  cancellations?: number;
  is_verified?: boolean;
  is_suspended?: boolean;
  hourly_rate?: number;
  dress_code_preference?: string;
}

interface RoleContextType {
  currentRole: Role;
  currentUser: User | null;
  workerProfile: WorkerProfile | null;
  isLoading: boolean;
  setRole: (role: Role) => Promise<void>;
  refreshWorkerProfile: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType>({
  currentRole: null,
  currentUser: null,
  workerProfile: null,
  isLoading: true,
  setRole: async () => {},
  refreshWorkerProfile: async () => {},
});

const ROLE_STORAGE_KEY = '@shiftslinger_role';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserForRole = useCallback(async (role: Role) => {
    if (!role) return;
    try {
      console.log(`[RoleContext] Fetching user for role: ${role}`);
      const user = await apiGet<User>(`/api/users/me?role=${role}`);
      setCurrentUser(user);
      console.log(`[RoleContext] User loaded:`, user);

      if (role === 'worker' && user?.id) {
        try {
          console.log(`[RoleContext] Fetching worker profile for user: ${user.id}`);
          const profile = await apiGet<WorkerProfile>(`/api/worker-profiles/me?user_id=${user.id}`);
          setWorkerProfile(profile);
          console.log(`[RoleContext] Worker profile loaded:`, profile);
        } catch (err) {
          console.warn('[RoleContext] Could not load worker profile:', err);
          setWorkerProfile(null);
        }
      } else {
        setWorkerProfile(null);
      }
    } catch (err) {
      console.error('[RoleContext] Failed to fetch user:', err);
    }
  }, []);

  const refreshWorkerProfile = useCallback(async () => {
    if (currentRole === 'worker' && currentUser?.id) {
      try {
        const profile = await apiGet<WorkerProfile>(`/api/worker-profiles/me?user_id=${currentUser.id}`);
        setWorkerProfile(profile);
      } catch (err) {
        console.warn('[RoleContext] Could not refresh worker profile:', err);
      }
    }
  }, [currentRole, currentUser]);

  const setRole = useCallback(async (role: Role) => {
    console.log(`[RoleContext] Setting role to: ${role}`);
    setCurrentRole(role);
    if (role) {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
    }
    await fetchUserForRole(role);
  }, [fetchUserForRole]);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
        console.log(`[RoleContext] Stored role: ${stored}`);
        if (stored && (stored === 'manager' || stored === 'worker' || stored === 'admin')) {
          setCurrentRole(stored as Role);
          await fetchUserForRole(stored as Role);
        }
      } catch (err) {
        console.error('[RoleContext] Init error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchUserForRole]);

  return (
    <RoleContext.Provider value={{ currentRole, currentUser, workerProfile, isLoading, setRole, refreshWorkerProfile }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
