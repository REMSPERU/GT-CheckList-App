'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { getAdminEquipmentById } from '@/services/admin/equipments.service';
import type { AdminEquipmentDetailRow } from '@/types/admin';
import { EquipmentForm } from '@/components/admin/equipment-form';
import { Zap, XCircle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

export default function AdminEquipmentEditPage() {
  const params = useParams<{ equipmentId: string }>();
  const searchParams = useSearchParams();
  const [equipment, setEquipment] = useState<AdminEquipmentDetailRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reconstruct the back href from the encoded query params passed by the list page, or return to details page
  const rawBack = searchParams.get('back');
  const backQuery = rawBack ? `?back=${rawBack}` : '';
  const backHref = `/admin/equipos/${params.equipmentId}${backQuery}`;

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await getAdminEquipmentById(supabase, params.equipmentId);

        if (isMounted) setEquipment(result);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el activo para edición',
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

  if (isLoading) {
    return (
      <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <section className="grid min-h-[300px] place-items-center rounded-[22px] border border-slate-200/80 bg-white shadow-sm mt-12">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-10 w-10">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-10 w-10 bg-emerald-500 items-center justify-center text-white">
                <Zap className="h-5 w-5 animate-pulse" />
              </span>
            </div>
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase animate-pulse">
              Cargando activo para edición...
            </span>
          </div>
        </section>
      </main>
    );
  }

  if (!equipment) {
    return (
      <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        {errorMessage && <Alert>{errorMessage}</Alert>}
        <section className="rounded-[22px] border border-red-100 bg-red-50/30 p-8 text-center shadow-sm mt-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
            <XCircle className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Activo No Encontrado
          </h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            El identificador del activo no es válido o fue eliminado del sistema.
          </p>
        </section>
      </main>
    );
  }

  return <EquipmentForm equipment={equipment} backHref={backHref} />;
}
