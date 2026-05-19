import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getCurrentAdminUser, signOut } from '@/services/auth/auth.service';
import type { AdminUser } from '@/types/auth';

export function useAdminSession() {
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
    router.replace('/login');
  }

  return { user, isCheckingSession, handleSignOut };
}
