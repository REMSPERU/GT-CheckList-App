'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes, updateAdminEquipmentTypeImage } from '@/services/admin/equipment-types.service';
import { getAdminProperty, updateAdminProperty } from '@/services/admin/properties.service';
import type { AdminEquipmentTypeRow, AdminPropertyRow } from '@/types/admin';
import { uploadPropertyPhoto, uploadEquipmentTypePhoto } from '@/utils/upload-image';

// Curated system images mapping function
function getSystemImage(systemName: string): string {
  const normalized = systemName.toLowerCase();
  if (normalized.includes('electr') || normalized.includes('tabler')) {
    return 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=400&q=80';
  }
  if (normalized.includes('agua') || normalized.includes('bomb') || normalized.includes('hidro') || normalized.includes('sanit')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
  }
  if (normalized.includes('incendio') || normalized.includes('fuego') || normalized.includes('extintor') || normalized.includes('aci')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
  }
  if (normalized.includes('ascensor') || normalized.includes('elevad') || normalized.includes('vertical')) {
    return 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80';
  }
  if (normalized.includes('aire') || normalized.includes('acondicion') || normalized.includes('hvac') || normalized.includes('ventilac') || normalized.includes('chiller')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
  }
  if (normalized.includes('grupo') || normalized.includes('generad') || normalized.includes('electrog')) {
    return 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=400&q=80';
  }
  if (normalized.includes('cctv') || normalized.includes('seguridad') || normalized.includes('camar') || normalized.includes('intrus')) {
    return 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
}

function getSystemEmoji(systemName: string): string {
  const normalized = systemName.toLowerCase();
  if (normalized.includes('electr') || normalized.includes('tabler')) return '⚡';
  if (normalized.includes('agua') || normalized.includes('bomb') || normalized.includes('hidro') || normalized.includes('sanit')) return '🚰';
  if (normalized.includes('incendio') || normalized.includes('fuego') || normalized.includes('extintor') || normalized.includes('aci')) return '🔥';
  if (normalized.includes('ascensor') || normalized.includes('elevad') || normalized.includes('vertical')) return '🛗';
  if (normalized.includes('aire') || normalized.includes('acondicion') || normalized.includes('hvac') || normalized.includes('ventilac')) return '❄️';
  if (normalized.includes('grupo') || normalized.includes('generad') || normalized.includes('electrog')) return '🔌';
  if (normalized.includes('cctv') || normalized.includes('seguridad') || normalized.includes('camar')) return '📹';
  return '🏢';
}

interface DBEquipo {
  id_equipamento: string | null;
}

interface DBSystem {
  id: string;
  nombre: string;
}

function PropertyDetailContent() {
  const params = useParams<{ propertyId: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<AdminPropertyRow | null>(null);
  const [systems, setSystems] = useState<DBSystem[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>([]);
  const [equipos, setEquipos] = useState<DBEquipo[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'systems' | 'edit'>('systems');

  // Form states
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editBasement, setEditBasement] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedEqType, setSelectedEqType] = useState<AdminEquipmentTypeRow | null>(null);
  const [uploadingTypeId, setUploadingTypeId] = useState<string | null>(null);
  const eqFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!params.propertyId) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();

        // Query property, systems catalog, equipment types catalog and direct equipments list
        const [propRes, sysRes, typesRes, equiposRes] = await Promise.all([
          getAdminProperty(supabase, params.propertyId),
          supabase.from('sistemas').select('id, nombre').order('nombre', { ascending: true }),
          listAdminEquipmentTypes(supabase),
          // Direct distinct-oriented query selecting only equipment type from equipments table by property ID
          supabase
            .from('equipos')
            .select('id_equipamento')
            .eq('id_property', params.propertyId)
        ]);

        if (!isMounted) return;

        if (!propRes) {
          throw new Error('No se encontró el inmueble solicitado');
        }

        setProperty(propRes);
        setSystems((sysRes.data ?? []) as DBSystem[]);
        setEquipmentTypes(typesRes);
        setEquipos((equiposRes.data ?? []) as DBEquipo[]);

        // Populate edit form
        setEditName(propRes.name || '');
        setEditCode(propRes.code || '');
        setEditCity(propRes.city || '');
        setEditAddress(propRes.address || '');
        setEditFloor(propRes.floor !== null && propRes.floor !== undefined ? String(propRes.floor) : '');
        setEditBasement(propRes.basement !== null && propRes.basement !== undefined ? String(propRes.basement) : '');
        setEditImageUrl(propRes.image_url || '');
        setImagePreview(propRes.image_url || null);

      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Error al cargar los datos');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [params.propertyId]);

  // Compute active systems and equipment types counts in this building
  const systemsWithCounts = useMemo(() => {
    if (!property || systems.length === 0 || equipmentTypes.length === 0) return [];

    // Map to count how many equipos of each equipment type exist in this property
    const typeCountMap = new Map<string, number>();
    equipos.forEach(eq => {
      if (eq.id_equipamento) {
        typeCountMap.set(eq.id_equipamento, (typeCountMap.get(eq.id_equipamento) || 0) + 1);
      }
    });

    return systems.map(system => {
      // Find equipment types under this system
      const typesUnderSystem = equipmentTypes.filter(t => t.systemId === system.id);

      // Filter types that have at least 1 equipo in this property
      const activeTypes = typesUnderSystem
        .map(type => ({
          ...type,
          count: typeCountMap.get(type.id) || 0,
        }))
        .filter(type => type.count > 0);

      const totalEquipos = activeTypes.reduce((acc, curr) => acc + curr.count, 0);

      return {
        id: system.id,
        nombre: system.nombre,
        types: activeTypes,
        totalEquipos,
      };
    }).filter(sys => sys.types.length > 0); // Only show systems that have active equipments

  }, [property, systems, equipmentTypes, equipos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setEditImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('El nombre del inmueble es requerido');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = getSupabaseClient();
      let finalImageUrl = editImageUrl;

      if (selectedFile) {
        finalImageUrl = await uploadPropertyPhoto(supabase, selectedFile, editName.trim());
      }

      const updated = await updateAdminProperty(supabase, params.propertyId, {
        name: editName.trim(),
        code: editCode.trim() || null,
        city: editCity.trim() || null,
        address: editAddress.trim() || null,
        image_url: finalImageUrl || null,
        floor: editFloor.trim() ? parseInt(editFloor.trim(), 10) : null,
        basement: editBasement.trim() ? parseInt(editBasement.trim(), 10) : null,
      });

      setProperty(updated);
      setEditImageUrl(updated.image_url || '');
      setSelectedFile(null);
      alert('Cambios guardados con éxito');
    } catch (error) {
      console.error('Error updating property:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEqFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedEqType) {
      try {
        setUploadingTypeId(selectedEqType.id);
        const supabase = getSupabaseClient();
        
        // 1. Upload to Supabase Storage
        const publicUrl = await uploadEquipmentTypePhoto(supabase, file, selectedEqType.nombre);
        
        // 2. Update column in database
        await updateAdminEquipmentTypeImage(supabase, selectedEqType.id, publicUrl);
        
        // 3. Update local state
        setEquipmentTypes(prev =>
          prev.map(t => (t.id === selectedEqType.id ? { ...t, image_url: publicUrl } : t))
        );
        
        alert(`Imagen de ${selectedEqType.nombre} actualizada con éxito`);
      } catch (error) {
        console.error('Error updating equipment type image:', error);
        alert(error instanceof Error ? error.message : 'Error al actualizar la imagen');
      } finally {
        setUploadingTypeId(null);
        setSelectedEqType(null);
        if (eqFileInputRef.current) {
          eqFileInputRef.current.value = '';
        }
      }
    }
  };

  const triggerEqImageUpload = (type: AdminEquipmentTypeRow) => {
    setSelectedEqType(type);
    setTimeout(() => {
      eqFileInputRef.current?.click();
    }, 0);
  };

  if (isLoading) {
    return (
      <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <div className="flex h-12 items-center">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-[220px] w-full animate-pulse rounded-[28px] bg-slate-200" />
        <div className="grid min-h-[200px] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-800" />
        </div>
      </main>
    );
  }

  if (errorMessage || !property) {
    return (
      <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <header className="flex h-12 items-center">
          <Link href="/admin/inmuebles" className="text-sm font-bold text-emerald-800 hover:underline">
            ← Volver a Inmuebles
          </Link>
        </header>
        <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <strong>⚠️ Error:</strong> {errorMessage || 'No se pudo cargar el inmueble'}
        </div>
      </main>
    );
  }

  return (
    <main className="grid gap-5 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      {/* Header Back Button */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-3">
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-[#0c1720] no-underline transition-colors hover:bg-slate-200 shadow-sm"
          href="/admin/inmuebles"
        >
          ← Volver a Inmuebles
        </Link>
      </header>

      {/* Property Banner Card */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {/* Cover Background */}
        <div className="relative h-[200px] w-full overflow-hidden bg-gradient-to-br from-emerald-800 to-slate-900">
          {property.image_url ? (
            <img
              className="h-full w-full object-cover opacity-80"
              src={property.image_url}
              alt={property.name}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-30">
              <span className="text-8xl">🏢</span>
            </div>
          )}

          {/* Glassmorphic Title Plate */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-black/35 p-5 text-white backdrop-blur-md border border-white/10">
            <div>
              <h1 className="m-0 text-2xl font-black leading-tight tracking-[-0.04em]">
                {property.name}
              </h1>
              <p className="m-0 mt-1 text-sm font-semibold text-white/80">
                📍 {property.address ? `${property.address}, ` : ''}{property.city || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50 px-6 py-4 text-center text-xs font-bold text-slate-600">
          <div>
            <strong className="block text-xl font-black text-slate-900">{systemsWithCounts.length}</strong>
            <span>Sistemas Activos</span>
          </div>
          <div>
            <strong className="block text-xl font-black text-slate-900">{equipos.length}</strong>
            <span>Equipos Totales</span>
          </div>
          <div>
            <strong className="block text-xl font-black text-slate-900">
              {property.floor !== null && property.floor !== undefined ? property.floor : '0'}
            </strong>
            <span>Pisos</span>
          </div>
          <div>
            <strong className="block text-xl font-black text-slate-900">
              {property.basement !== null && property.basement !== undefined ? property.basement : '0'}
            </strong>
            <span>Sótanos</span>
          </div>
        </div>
      </section>

      {/* Tabs Control */}
      <section className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('systems')}
          className={`border-b-2 px-6 py-3 text-sm font-bold transition-all ${activeTab === 'systems'
            ? 'border-emerald-800 text-emerald-800'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          🗂️ Sistemas y Equipos
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`border-b-2 px-6 py-3 text-sm font-bold transition-all ${activeTab === 'edit'
            ? 'border-emerald-800 text-emerald-800'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          ⚙️ Editar Información
        </button>
      </section>

      {/* Tab Panels */}
      {activeTab === 'systems' ? (
        <section className="grid gap-6">
          {systemsWithCounts.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-10 text-center">
              <span className="text-4xl block mb-2">⚙️</span>
              <strong className="text-lg text-slate-950 block">Sin equipos registrados</strong>
              <p className="text-sm text-slate-500 mt-2 mb-4">
                Este inmueble no tiene equipos asignados. Agrega equipos y asígnalos a este inmueble para verlos aquí.
              </p>
              <Link
                href="/admin/equipos"
                className="inline-block rounded-full bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white no-underline hover:bg-emerald-950 transition"
              >
                Ir a Equipos
              </Link>
            </div>
          ) : (
            systemsWithCounts.map(system => (
              <div key={system.id} className="grid gap-4">
                {/* System Group Header */}
                <h3 className="m-0 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-black uppercase tracking-wider text-emerald-800">
                  <span>{getSystemEmoji(system.nombre)}</span>
                  <span>{system.nombre}</span>
                  <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.68rem] font-bold text-emerald-900 border border-emerald-100">
                    {system.totalEquipos} equipo{system.totalEquipos === 1 ? '' : 's'}
                  </span>
                </h3>

                {/* Grid of Equipment Type Cards */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-[480px]:grid-cols-1">
                  {system.types.map(type => {
                    const bgImage = type.image_url || getSystemImage(system.nombre);
                    return (
                      <Link
                        key={type.id}
                        href={`/admin/equipos?property=${property.id}&system=${system.id}&eqType=${type.id}`}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 no-underline flex flex-col"
                      >
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerEqImageUpload(type);
                          }}
                          disabled={uploadingTypeId !== null}
                          className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm border border-white/20 transition-all hover:bg-black/85 hover:scale-105"
                          title="Cambiar imagen de portada"
                        >
                          {uploadingTypeId === type.id ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            '✏️'
                          )}
                        </button>

                        {/* Card Background image */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                          <img
                            src={bgImage}
                            alt={type.nombre}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <span className="absolute bottom-2 left-3 text-[0.68rem] font-black uppercase tracking-wider text-lime-200">
                            {type.frecuencia || 'Sin frecuencia'}
                          </span>
                        </div>
                        {/* Content */}
                        <div className="p-3.5 flex flex-col flex-1 justify-between gap-1">
                          <h4 className="m-0 text-sm font-black leading-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {type.nombre}
                          </h4>
                          <span className="text-xs font-bold text-slate-400">
                            {type.count} dispositivo{type.count === 1 ? '' : 's'} →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Hidden File Input for Equipment Type Photo */}
          <input
            type="file"
            ref={eqFileInputRef}
            onChange={handleEqFileChange}
            accept="image/*"
            className="hidden"
          />
        </section>
      ) : (
        <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
          <form onSubmit={handleEditSubmit} className="grid gap-5">
            {/* Cover Image */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Foto de Portada
              </label>
              {imagePreview ? (
                <div className="relative aspect-[16/6] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img src={imagePreview} alt="Portada" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 font-bold text-white shadow hover:bg-red-700"
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-[16/6] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-emerald-600 hover:bg-white"
                >
                  <span className="text-3xl mb-1">📷</span>
                  <strong className="text-xs text-slate-700">Subir una nueva imagen</strong>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Basic Info */}
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nombre del Inmueble *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dirección
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Floors and Basements inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Número de Pisos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Número de Sótanos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editBasement}
                    onChange={(e) => setEditBasement(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-emerald-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-950 transition flex items-center justify-center gap-2"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

export default function AdminPropertyDetailPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-[400px] place-items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
        <p className="text-sm text-slate-500 font-medium">Cargando inmueble...</p>
      </div>
    }>
      <PropertyDetailContent />
    </Suspense>
  );
}
