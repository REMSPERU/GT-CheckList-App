'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { getCurrentAdminUser, signOut } from '@/services/auth/auth.service';
import type { AdminUser } from '@/types/auth';

interface AdminSessionContextValue {
  user: AdminUser | null;
  isCheckingSession: boolean;
  handleSignOut: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

interface AdminSessionProviderProps {
  children: ReactNode;
}

export function AdminSessionProvider({ children }: AdminSessionProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const currentUser = await getCurrentAdminUser();

      if (!isMounted) return;

      if (!currentUser) {
        router.replace('/login');
        return;
      }

      setUser(currentUser);
      setIsCheckingSession(false);
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    router.replace('/login');
  }

  return (
    <AdminSessionContext.Provider
      value={{ user, isCheckingSession, handleSignOut }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error('useAdminSession must be used within AdminSessionProvider');
  }

  return context;
}
