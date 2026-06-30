'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  MapPin,
  Camera,
  Layers,
  Info,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Cpu,
  Loader2,
  FolderOpen,
  X,
  AlertCircle
} from 'lucide-react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes, updateAdminEquipmentTypeImage } from '@/services/admin/equipment-types.service';
import { getAdminProperty, updateAdminProperty, updateAdminPropertyImage } from '@/services/admin/properties.service';
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
  const [activeTab, setActiveTab] = useState<'systems' | 'info'>('systems');
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editBasement, setEditBasement] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Status operation modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate'>('deactivate');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

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
        setEditIsActive(propRes.is_active !== false);

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

  // Synchronize status when isEditing triggers or property changes
  useEffect(() => {
    if (property) {
      setEditIsActive(property.is_active !== false);
    }
  }, [isEditing, property]);

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

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && property) {
      try {
        setIsSaving(true);
        const supabase = getSupabaseClient();
        
        // 1. Upload to Supabase Storage
        const finalImageUrl = await uploadPropertyPhoto(supabase, file, property.name);
        
        // 2. Update column in database
        await updateAdminPropertyImage(supabase, params.propertyId, finalImageUrl);
        
        // 3. Update local state
        setProperty(prev => prev ? { ...prev, image_url: finalImageUrl } : null);
        setEditImageUrl(finalImageUrl);
        setImagePreview(finalImageUrl);
        alert('Foto de portada actualizada con éxito');
      } catch (error) {
        console.error('Error updating property image:', error);
        alert(error instanceof Error ? error.message : 'Error al actualizar la foto de portada');
      } finally {
        setIsSaving(false);
        if (bannerFileInputRef.current) {
          bannerFileInputRef.current.value = '';
        }
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (property) {
      setEditName(property.name || '');
      setEditCode(property.code || '');
      setEditCity(property.city || '');
      setEditAddress(property.address || '');
      setEditFloor(property.floor !== null && property.floor !== undefined ? String(property.floor) : '');
      setEditBasement(property.basement !== null && property.basement !== undefined ? String(property.basement) : '');
      setEditImageUrl(property.image_url || '');
      setImagePreview(property.image_url || null);
      setEditIsActive(property.is_active !== false);
      setSelectedFile(null);
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
        is_active: editIsActive,
      });

      setProperty(updated);
      setEditImageUrl(updated.image_url || '');
      setSelectedFile(null);
      setIsEditing(false);
      alert('Cambios guardados con éxito');
    } catch (error) {
      console.error('Error updating property:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!property) return;
    try {
      setIsSaving(true);
      const supabase = getSupabaseClient();
      const nextActive = statusAction === 'activate';

      const updated = await updateAdminProperty(supabase, property.id, {
        is_active: nextActive,
      });

      setProperty(updated);
      setIsStatusModalOpen(false);
      alert(nextActive ? 'Inmueble reactivado con éxito' : 'Inmueble dado de baja con éxito');
    } catch (error) {
      console.error('Error changing property status:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar el estado del inmueble');
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
      <main className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <div className="flex h-12 items-center">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-[260px] w-full animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid min-h-[200px] place-items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-800" />
            <p className="text-xs text-slate-500 font-bold">Cargando información técnica...</p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !property) {
    return (
      <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
        <header className="flex h-12 items-center">
          <Link href="/admin/inmuebles" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a Inmuebles</span>
          </Link>
        </header>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800 flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <strong>⚠️ Error:</strong> {errorMessage || 'No se pudo cargar el inmueble'}
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
          href="/admin/inmuebles"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Inmuebles</span>
        </Link>
        <span className="text-slate-300 font-bold">/</span>
        <span className="text-xs font-bold text-slate-800 truncate">
          {property.name}
        </span>
      </header>

      {/* Property Banner Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        {/* Cover Background */}
        <div className="relative h-[240px] md:h-[280px] w-full overflow-hidden bg-gradient-to-br from-[#0c3c2e] via-[#082920] to-[#04120e]">
          {/* Geometrical construction blueprint grid pattern (CSS pattern) */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          {property.image_url ? (
            <img
              className="h-full w-full object-cover opacity-75 transition-all duration-300"
              src={property.image_url}
              alt={property.name}
            />
          ) : null}

          {/* Banner Photo Upload Button */}
          <button
            type="button"
            onClick={() => bannerFileInputRef.current?.click()}
            disabled={isSaving}
            className="absolute top-5 right-5 z-20 flex items-center gap-2 rounded-xl bg-black/55 px-4 py-2.5 text-xs font-black text-white hover:bg-black/75 transition shadow border border-white/10 backdrop-blur-md"
          >
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

          {/* Glassmorphic Title Plate */}
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-slate-950/40 p-5 text-white backdrop-blur-md border border-white/10 shadow-lg">
            <div className="grid gap-1">
              {/* Status Badge inside banner */}
              <div className="flex items-center gap-2">
                {property.is_active !== false ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-400/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/25 border border-slate-400/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-300">
                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                    Inactivo
                  </span>
                )}
                {property.code && (
                  <span className="rounded bg-white/10 border border-white/5 px-2 py-0.5 text-[9px] font-bold uppercase text-white/90">
                    {property.code}
                  </span>
                )}
              </div>
              <h1 className="m-0 text-xl md:text-2xl font-black leading-tight tracking-[-0.04em]">
                {property.name}
              </h1>
              {property.address && (
                <p className="m-0 flex items-center gap-1 text-xs font-semibold text-white/80">
                  <MapPin className="h-3 w-3 shrink-0 text-emerald-400" />
                  <span>{property.address}{property.city ? `, ${property.city}` : ''}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Grid Widgets */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Systems */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <strong className="block text-2xl font-black text-slate-950 leading-tight">
              {systemsWithCounts.length}
            </strong>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Especialidades Activas
            </span>
          </div>
        </div>

        {/* Total Devices */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 border border-blue-100">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <strong className="block text-2xl font-black text-slate-950 leading-tight">
              {equipos.length}
            </strong>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Activos Totales
            </span>
          </div>
        </div>

        {/* Floors */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-800 border border-purple-100">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <strong className="block text-2xl font-black text-slate-950 leading-tight">
              {property.floor !== null && property.floor !== undefined ? property.floor : '0'}
            </strong>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Pisos
            </span>
          </div>
        </div>

        {/* Basements */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-100">
            <Layers className="h-6 w-6 rotate-180" />
          </div>
          <div>
            <strong className="block text-2xl font-black text-slate-950 leading-tight">
              {property.basement !== null && property.basement !== undefined ? property.basement : '0'}
            </strong>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Sótanos
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Control */}
      <section className="flex border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            setActiveTab('systems');
            setIsEditing(false);
          }}
          className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-all -mb-[2px] ${
            activeTab === 'systems'
              ? 'border-emerald-800 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🗂️ Especialidades y Activos</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black shadow-sm ${
            activeTab === 'systems' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {systemsWithCounts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('info');
            setIsEditing(false);
          }}
          className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-all -mb-[2px] ${
            activeTab === 'info'
              ? 'border-emerald-800 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>ℹ️ Información del Inmueble</span>
        </button>
      </section>

      {/* Tab Panels */}
      {activeTab === 'systems' ? (
        <section className="grid gap-6">
          {systemsWithCounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center shadow-inner">
              <span className="text-4xl block mb-2">⚙️</span>
              <strong className="text-lg text-slate-900 block font-black">Sin activos registrados</strong>
              <p className="text-sm text-slate-500 mt-2 mb-4 font-medium max-w-sm mx-auto">
                Este inmueble no posee activos cargados en su inventario en este momento.
              </p>
              <Link
                href="/admin/equipos"
                className="inline-block rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-950 transition shadow-sm"
              >
                Ir a Activos
              </Link>
            </div>
          ) : (
            systemsWithCounts.map(system => (
              <div key={system.id} className="grid gap-4 bg-slate-50/40 border border-slate-200/50 rounded-2xl p-5 shadow-sm">
                {/* System Group Header */}
                <h3 className="m-0 flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-black uppercase tracking-widest text-slate-700">
                  <span className="text-base">{getSystemEmoji(system.nombre)}</span>
                  <span>{system.nombre}</span>
                  <span className="ml-auto rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">
                    {system.totalEquipos.toLocaleString('en-US')} activo{system.totalEquipos === 1 ? '' : 's'}
                  </span>
                </h3>

                {/* Grid of Equipment Type Cards */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-[480px]:grid-cols-1">
                  {system.types.map(type => {
                    const bgImage = type.image_url || getSystemImage(system.nombre);
                    return (
                      <Link
                        key={type.id}
                        href={`/admin/equipos?property=${property.id}&system=${system.id}&eqType=${type.id}`}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 no-underline flex flex-col"
                      >
                        {/* Camera upload cover photo button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerEqImageUpload(type);
                          }}
                          disabled={uploadingTypeId !== null}
                          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 transition-all hover:bg-black/85 hover:scale-105 shadow-sm"
                          title="Cambiar imagen de portada"
                        >
                          {uploadingTypeId === type.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          ) : (
                            <Camera className="h-4.5 w-4.5 text-white" />
                          )}
                        </button>

                        {/* Card Image Area */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                          <img
                            src={bgImage}
                            alt={type.nombre}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                          <span className="absolute bottom-2.5 left-3 rounded-md bg-lime-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#061e1b] shadow-sm">
                            {type.frecuencia || 'Sin frecuencia'}
                          </span>
                        </div>
                        
                        {/* Card Text Content */}
                        <div className="p-4 flex flex-col flex-1 justify-between gap-1.5">
                          <h4 className="m-0 text-sm font-black leading-tight text-slate-950 group-hover:text-emerald-800 transition-colors">
                            {type.nombre}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                            <span>{type.count.toLocaleString('en-US')} dispositivo{type.count === 1 ? '' : 's'}</span>
                            <span className="transition-transform group-hover:translate-x-1 text-slate-300">→</span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {!isEditing ? (
            <>
              {/* Left detail card */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {/* Section Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="m-0 text-base font-black text-slate-950">Datos Generales</h2>
                    <p className="m-0 mt-0.5 text-xs text-slate-500 font-semibold">
                      Ficha técnica del inmueble
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 transition hover:bg-emerald-100 shadow-sm cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Editar Datos</span>
                  </button>
                </div>

                {/* Information grid list */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 max-[480px]:grid-cols-1">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Nombre del Inmueble
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-slate-900 leading-normal">
                      {property.name}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Código Interno
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-slate-900 leading-normal">
                      {property.code || (
                        <span className="text-slate-400 font-medium italic">No especificado</span>
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Ciudad
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-slate-900 leading-normal">
                      {property.city || (
                        <span className="text-slate-400 font-medium italic">No especificada</span>
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Dirección
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-slate-900 leading-normal">
                      {property.address || (
                        <span className="text-slate-400 font-medium italic">No especificada</span>
                      )}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Número de Pisos
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-slate-900 leading-normal">
                      {property.floor !== null && property.floor !== undefined ? property.floor : 0}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Número de Sótanos
                    </span>
                    <strong className="mt-1 block text-sm font-semibold text-slate-900 leading-normal">
                      {property.basement !== null && property.basement !== undefined ? property.basement : 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Status control administration card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="m-0 text-base font-black text-slate-950 border-b border-slate-100 pb-4 mb-4">
                  Operación y Estado
                </h3>
                
                <div className="grid gap-5">
                  <div className="flex items-center gap-3">
                    {property.is_active !== false ? (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/50 px-3 py-2.5 text-emerald-900 font-bold text-xs w-full shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Inmueble Operativo (Activo)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2.5 text-slate-600 font-bold text-xs w-full shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                        </span>
                        <span>Dado de Baja (Inactivo)</span>
                      </div>
                    )}
                  </div>

                  <p className="m-0 text-[11px] text-slate-500 leading-relaxed font-semibold">
                    {property.is_active !== false
                      ? 'Desactivar un inmueble impedirá que se creen nuevos checklists de inspección asociados a él. También lo ocultará de los formularios en la app móvil.'
                      : 'Activar el inmueble lo habilitará nuevamente para la asignación de mantenimientos y checklists, volviendo a aparecer para los auditores.'}
                  </p>

                  {property.is_active !== false ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusAction('deactivate');
                        setIsStatusModalOpen(true);
                      }}
                      className="w-full inline-flex justify-center items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 cursor-pointer shadow-sm"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Dar de Baja Inmueble</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusAction('activate');
                        setIsStatusModalOpen(true);
                      }}
                      className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-950 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Reactivar Inmueble</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Editing form wrapper layout (takes full 3 columns) */
            <form onSubmit={handleEditSubmit} className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-3xl">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h2 className="m-0 text-base font-black text-slate-950">Editar Datos del Inmueble</h2>
                <p className="m-0 mt-0.5 text-xs text-slate-500 font-semibold">
                  Modifica los parámetros físicos y de estado del inmueble.
                </p>
              </div>

              <div className="grid gap-5">
                {/* Banner/Cover Image Area in Form */}
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Foto de Portada
                  </label>
                  {imagePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative aspect-[16/6] w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner"
                    >
                      <img src={imagePreview} alt="Portada" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <span className="text-white font-bold text-xs bg-slate-900/70 border border-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                          📷 Seleccionar otra imagen
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage();
                        }}
                        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 font-bold text-white shadow-md hover:bg-red-700 transition"
                        title="Eliminar portada"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-[16/6] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-emerald-600 hover:bg-white"
                    >
                      <Camera className="h-8 w-8 text-slate-400 mb-1" />
                      <strong className="text-xs text-slate-700">Subir una nueva imagen</strong>
                      <span className="text-[10px] text-slate-400 mt-0.5">Formato WebP o JPG recomendado</span>
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

                {/* Form fields */}
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
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

                  <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
                    <div>
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
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
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
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
                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
                    <div>
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
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
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
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

                  {/* Form active/inactive switch */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm mt-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                        Estado del Inmueble
                      </label>
                      <p className="m-0 mt-0.5 text-[11px] text-slate-500 font-semibold">
                        {editIsActive ? 'El inmueble se guardará como activo y visible en la app.' : 'El inmueble se guardará como inactivo (de baja).'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditIsActive(!editIsActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editIsActive ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={editIsActive}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          editIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="rounded-full bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-950 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Confirmation Status Modal overlay */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsStatusModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${
              statusAction === 'deactivate' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-800'
            }`}>
              <AlertTriangle className="h-5.5 w-5.5" />
            </div>
            
            <h4 className="m-0 text-base font-black text-slate-950 leading-tight">
              {statusAction === 'deactivate' ? '¿Confirmar dar de baja?' : '¿Confirmar reactivación?'}
            </h4>
            
            <p className="mt-2 text-xs text-slate-500 leading-relaxed font-semibold">
              {statusAction === 'deactivate'
                ? 'Esta acción marcará el inmueble como inactivo. Se desactivará en las listas del auditor y nuevas planificaciones.'
                : 'Esta acción volverá a activar el inmueble para su uso y asignaciones en el panel y app móvil.'}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isSaving}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition flex justify-center items-center gap-1.5 shadow-sm cursor-pointer ${
                  statusAction === 'deactivate' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-800 hover:bg-emerald-950'
                }`}
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{statusAction === 'deactivate' ? 'Dar de Baja' : 'Reactivar'}</span>
              </button>
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
      <input
        type="file"
        ref={bannerFileInputRef}
        onChange={handleBannerFileChange}
        accept="image/*"
        className="hidden"
      />
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
