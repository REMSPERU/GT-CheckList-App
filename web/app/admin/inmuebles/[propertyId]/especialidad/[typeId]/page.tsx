'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { EquipmentDetailView } from '@/components/admin/equipment-detail-view';
import {
  ArrowLeft,
  Camera,
  Cpu,
  Loader2,
  MapPin,
  Info,
} from 'lucide-react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import {
  listAdminEquipmentTypes,
  updateAdminEquipmentTypeImage,
} from '@/services/admin/equipment-types.service';
import { getAdminProperty } from '@/services/admin/properties.service';
import { getAdminEquipmentById } from '@/services/admin/equipments.service';
import type {
  AdminEquipmentTypeRow,
  AdminPropertyRow,
  AdminEquipmentDetailRow,
} from '@/types/admin';
import { uploadEquipmentTypePhoto } from '@/utils/upload-image';

// Curated system images mapping function
function getSystemImage(systemName: string): string {
  const normalized = systemName.toLowerCase();
  if (normalized.includes('electr') || normalized.includes('tabler')) {
    return 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=400&q=80';
  }
  if (
    normalized.includes('agua') ||
    normalized.includes('bomb') ||
    normalized.includes('hidro') ||
    normalized.includes('sanit')
  ) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
  }
  if (
    normalized.includes('incendio') ||
    normalized.includes('fuego') ||
    normalized.includes('extintor') ||
    normalized.includes('aci')
  ) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
  }
  if (
    normalized.includes('ascensor') ||
    normalized.includes('elevad') ||
    normalized.includes('vertical')
  ) {
    return 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80';
  }
  if (
    normalized.includes('aire') ||
    normalized.includes('acondicion') ||
    normalized.includes('hvac') ||
    normalized.includes('ventilac') ||
    normalized.includes('chiller')
  ) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
  }
  if (
    normalized.includes('grupo') ||
    normalized.includes('generad') ||
    normalized.includes('electrog')
  ) {
    return 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=400&q=80';
  }
  if (
    normalized.includes('cctv') ||
    normalized.includes('seguridad') ||
    normalized.includes('camar') ||
    normalized.includes('intrus')
  ) {
    return 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
}

function getSystemEmoji(systemName: string): string {
  const normalized = systemName.toLowerCase();
  if (normalized.includes('electr') || normalized.includes('tabler'))
    return '⚡';
  if (
    normalized.includes('agua') ||
    normalized.includes('bomb') ||
    normalized.includes('hidro') ||
    normalized.includes('sanit')
  )
    return '🚰';
  if (
    normalized.includes('incendio') ||
    normalized.includes('fuego') ||
    normalized.includes('extintor') ||
    normalized.includes('aci')
  )
    return '🔥';
  if (
    normalized.includes('ascensor') ||
    normalized.includes('elevad') ||
    normalized.includes('vertical')
  )
    return '🛗';
  if (
    normalized.includes('aire') ||
    normalized.includes('acondicion') ||
    normalized.includes('hvac') ||
    normalized.includes('ventilac')
  )
    return '❄️';
  if (
    normalized.includes('grupo') ||
    normalized.includes('generad') ||
    normalized.includes('electrog')
  )
    return '🔌';
  if (
    normalized.includes('cctv') ||
    normalized.includes('seguridad') ||
    normalized.includes('camar')
  )
    return '📹';
  return '🏢';
}

interface DBEquipo {
  id: string;
  id_equipamento: string | null;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
}

function SpecialtyDetailContent() {
  const params = useParams<{ propertyId: string; typeId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipmentIdParam = searchParams.get('equipmentId');

  const [property, setProperty] = useState<AdminPropertyRow | null>(null);
  const [equipmentType, setEquipmentType] = useState<AdminEquipmentTypeRow | null>(null);
  const [equipos, setEquipos] = useState<DBEquipo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eqFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!params.propertyId || !params.typeId) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();

        // 1. Fetch property and equipment types
        const [propRes, typesRes] = await Promise.all([
          getAdminProperty(supabase, params.propertyId),
          listAdminEquipmentTypes(supabase),
        ]);

        if (!isMounted) return;

        if (!propRes) {
          throw new Error('No se encontró el inmueble solicitado');
        }

        const currentType = typesRes.find(t => t.id === params.typeId);
        if (!currentType) {
          throw new Error('No se encontró la especialidad solicitada');
        }

        // 2. Fetch equipments of this property and equipment type
        const { data: equiposData, error: equiposError } = await supabase
          .from('equipos')
          .select('id, id_equipamento, codigo, ubicacion, detalle_ubicacion, estatus')
          .eq('id_property', params.propertyId)
          .eq('id_equipamento', params.typeId);

        if (equiposError) throw equiposError;

        if (!isMounted) return;

        setProperty(propRes);
        setEquipmentType(currentType);
        setEquipos((equiposData ?? []) as DBEquipo[]);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Error al cargar los datos',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [params.propertyId, params.typeId]);

  const handleEqFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && equipmentType) {
      try {
        setIsSaving(true);
        const supabase = getSupabaseClient();

        // 1. Upload to Supabase Storage
        const publicUrl = await uploadEquipmentTypePhoto(
          supabase,
          file,
          equipmentType.nombre,
        );

        // 2. Update column in database
        await updateAdminEquipmentTypeImage(
          supabase,
          equipmentType.id,
          publicUrl,
        );

        // 3. Update local state
        setEquipmentType(prev =>
          prev ? { ...prev, image_url: publicUrl } : null,
        );

        alert(`Imagen de ${equipmentType.nombre} actualizada con éxito`);
      } catch (error) {
        console.error('Error updating equipment type image:', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Error al actualizar la imagen',
        );
      } finally {
        setIsSaving(false);
        if (eqFileInputRef.current) {
          eqFileInputRef.current.value = '';
        }
      }
    }
  };

  if (isLoading) {
    return (
      <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <div className="flex h-12 items-center">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-[260px] w-full animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid min-h-[200px] place-items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
            <p className="text-xs text-slate-500 font-bold">
              Cargando especialidad...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !property || !equipmentType) {
    return (
      <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <header className="flex h-12 items-center">
          <Link
            href={property ? `/admin/inmuebles/${property.id}` : "/admin/inmuebles"}
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Inmueble</span>
          </Link>
        </header>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800 flex flex-col items-center gap-2">
          <Info className="h-8 w-8 text-red-600" />
          <strong>⚠️ Error:</strong>{' '}
          {errorMessage || 'No se pudo cargar la especialidad'}
        </div>
      </main>
    );
  }

  return (
    <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      {/* Header Breadcrumb Navigation */}
      <header className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <Link
          className="group inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-sm"
          href={`/admin/inmuebles/${property.id}`}>
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Volver al Inmueble</span>
        </Link>
        <span className="text-slate-300 font-bold">/</span>
        <Link
          href="/admin/inmuebles"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition">
          Inmuebles
        </Link>
        <span className="text-slate-300 font-bold">/</span>
        <Link
          href={`/admin/inmuebles/${property.id}`}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition truncate max-w-[150px]">
          {property.name}
        </Link>
        <span className="text-slate-300 font-bold">/</span>
        <span className="text-xs font-bold text-slate-800 truncate">
          {equipmentType.nombre}
        </span>
      </header>

      {equipmentIdParam ? (
        <EquipmentDetailSection
          equipmentId={equipmentIdParam}
          onBack={() => router.push(`/admin/inmuebles/${property.id}/especialidad/${equipmentType.id}`)}
        />
      ) : (
        <div className="grid gap-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative min-h-[220px] overflow-hidden bg-slate-950">
              <img
                src={
                  equipmentType.image_url ||
                  getSystemImage(equipmentType.systemName)
                }
                alt={equipmentType.nombre}
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(132,204,22,0.35),transparent_34%),linear-gradient(135deg,rgba(4,18,14,0.96),rgba(12,60,46,0.78))]" />

              {/* Banner Photo Upload Button */}
              <button
                type="button"
                onClick={() => eqFileInputRef.current?.click()}
                disabled={isSaving}
                className="absolute top-5 right-5 z-20 flex items-center gap-2 rounded-xl bg-black/55 px-4 py-2.5 text-xs font-black text-white hover:bg-black/75 transition shadow border border-white/10 backdrop-blur-md">
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" />
                    <span>Cambiar Foto</span>
                  </>
                )}
              </button>

              <div className="relative grid gap-5 p-6 text-white md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-100/90">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur">
                      {getSystemEmoji(equipmentType.systemName)}{' '}
                      {equipmentType.systemName}
                    </span>
                    <span className="rounded-full border border-lime-300/30 bg-lime-300 px-3 py-1 text-[#061e1b]">
                      {equipmentType.frecuencia || 'Sin frecuencia'}
                    </span>
                  </div>
                  <div>
                    <h2 className="m-0 text-2xl font-black leading-tight tracking-[-0.04em] md:text-3xl">
                      {equipmentType.nombre}
                    </h2>
                    <p className="m-0 mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/75">
                      Activos de esta especialidad dentro de {property.name}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                    <strong className="block text-2xl font-black leading-none">
                      {equipos.length.toLocaleString('en-US')}
                    </strong>
                    <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-white/60">
                      Activos
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                    <strong className="block text-2xl font-black leading-none">
                      {equipmentType.abreviatura || 'N/A'}
                    </strong>
                    <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-white/60">
                      Código tipo
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="m-0 text-base font-black text-slate-950">
                    Equipos registrados
                  </h3>
                  <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">
                    Lista filtrada por inmueble y tipo de equipo.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-100">
                  {property.code || property.name}
                </span>
              </div>

              {equipos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-slate-500 font-semibold shadow-inner">
                  No se encontraron equipos registrados para esta especialidad.
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                  {equipos.map(equipo => (
                    <Link
                      key={equipo.id}
                      href={`/admin/inmuebles/${property.id}/especialidad/${equipmentType.id}?equipmentId=${equipo.id}`}
                      className="group block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md text-left no-underline">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 ring-1 ring-slate-200 transition group-hover:ring-emerald-200">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
                          {equipo.estatus || 'Sin estado'}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2">
                        <strong className="text-sm font-black text-slate-950">
                          {equipo.codigo || 'Sin código'}
                        </strong>
                        <div className="grid gap-1 text-[11px] font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {equipo.ubicacion || 'Ubicación no especificada'}
                          </span>
                          {equipo.detalle_ubicacion ? (
                            <span className="inline-flex items-start gap-1.5">
                              <Info className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                              {equipo.detalle_ubicacion}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs always mounted on the DOM */}
      <input
        type="file"
        ref={eqFileInputRef}
        onChange={handleEqFileChange}
        accept="image/*"
        className="hidden"
      />
    </main>
  );
}

interface EquipmentDetailSectionProps {
  equipmentId: string;
  onBack: () => void;
}

function EquipmentDetailSection({
  equipmentId,
  onBack,
}: EquipmentDetailSectionProps) {
  const [equipment, setEquipment] = useState<AdminEquipmentDetailRow | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await getAdminEquipmentById(supabase, equipmentId);

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
  }, [equipmentId]);

  return (
    <EquipmentDetailView
      equipment={equipment}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onBackClick={onBack}
      backText="Volver a la lista de activos"
    />
  );
}

export default function AdminSpecialtyDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm text-slate-500 font-medium">
            Cargando especialidad...
          </p>
        </div>
      }>
      <SpecialtyDetailContent />
    </Suspense>
  );
}
