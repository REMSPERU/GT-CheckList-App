import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getCurrentAdminUser } from '@/services/auth/auth.service';

export function useHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function routeBySession() {
      const user = await getCurrentAdminUser();

      if (!isMounted) return;

      router.replace(
        user
          ? user.role === 'SUPERADMIN'
            ? '/admin'
            : '/admin/checklist'
          : '/login',
      );
    }

    void routeBySession();

    return () => {
      isMounted = false;
    };
  }, [router]);
}
