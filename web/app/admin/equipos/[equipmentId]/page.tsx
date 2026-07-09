'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { getAdminEquipmentById } from '@/services/admin/equipments.service';
import type { AdminEquipmentDetailRow } from '@/types/admin';
import { EquipmentDetailView } from '@/components/admin/equipment-detail-view';

export default function AdminEquipmentDetailPage() {
  const params = useParams<{ equipmentId: string }>();
  const searchParams = useSearchParams();
  const [equipment, setEquipment] = useState<AdminEquipmentDetailRow | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reconstruct the back href from the encoded query params passed by the list page
  const rawBack = searchParams.get('back');
  const backHref = rawBack
    ? `/admin/equipos?${decodeURIComponent(rawBack)}`
    : '/admin/equipos';

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await getAdminEquipmentById(
          supabase,
          params.equipmentId,
        );

        if (isMounted) setEquipment(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el activo',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadEquipment();

    return () => {
      isMounted = false;
    };
  }, [params.equipmentId]);

  // Reset scroll to top immediately when component mounts to prevent scroll jump flash
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <EquipmentDetailView
      equipment={equipment}
      isLoading={isLoading}
      errorMessage={errorMessage}
      backHref={backHref}
    />
  );
}
