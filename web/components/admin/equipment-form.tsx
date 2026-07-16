'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import type { AdminEquipmentDetailRow } from '@/types/admin';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { updateAdminEquipment } from '@/services/admin/equipments.service';
import { DynamicJsonEditor } from './dynamic-json-editor';

interface EquipmentFormProps {
  equipment: AdminEquipmentDetailRow;
  backHref: string;
}

export function EquipmentForm({ equipment, backHref }: EquipmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [codigo, setCodigo] = useState(equipment.codigo ?? '');
  const [ubicacion, setUbicacion] = useState(equipment.ubicacion ?? '');
  const [detalleUbicacion, setDetalleUbicacion] = useState(equipment.detalle_ubicacion ?? '');
  const [estatus, setEstatus] = useState(equipment.estatus ?? 'Operativo');
  const [config, setConfig] = useState(equipment.config ?? false);
  const [equipmentDetail, setEquipmentDetail] = useState<unknown>(equipment.equipment_detail ?? {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      await updateAdminEquipment(supabase, equipment.id, {
        codigo: codigo || null,
        ubicacion: ubicacion || null,
        detalle_ubicacion: detalleUbicacion || null,
        estatus: estatus || null,
        config: config,
        equipment_detail: equipmentDetail,
      });

      // Refresca la vista y regresa a la página de detalles
      router.push(backHref);
      router.refresh();
    } catch (err) {
      console.error('Error al actualizar el activo:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      <header className="flex flex-col gap-4 border-b border-slate-200/60 pb-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 text-xs font-bold text-slate-600 transition-all duration-200 hover:-translate-x-0.5 active:translate-x-0 active:scale-95 shadow-sm border border-slate-200/40 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        <div className="space-y-1">
          <h1 className="m-0 text-xl font-black tracking-tight text-slate-800 font-mono">
            Editar Activo: {equipment.codigo ?? 'Sin código'}
          </h1>
          <p className="m-0 text-xs font-semibold text-slate-500">
            {equipment.propertyName} · {equipment.equipmentName}
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Información Básica */}
        <div className="space-y-6">
          <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-sm overflow-hidden p-6 space-y-4">
            <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-800 border-b border-slate-100 pb-3">
              Información Básica
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Código del Activo
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Estatus
                </label>
                <select
                  value={estatus}
                  onChange={(e) => setEstatus(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="Operativo">Operativo</option>
                  <option value="Inoperativo">Inoperativo</option>
                  <option value="En Mantenimiento">En Mantenimiento</option>
                  <option value="Observado">Observado</option>
                  <option value="Dado de Baja">Dado de Baja</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="config"
                  checked={config}
                  onChange={(e) => setConfig(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="config" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  ¿Configurado?
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-sm overflow-hidden p-6 space-y-4">
            <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-800 border-b border-slate-100 pb-3">
              Ubicación
            </h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Zona / Sector
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej: Azotea, Sótano 1"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Detalle de Ubicación
                </label>
                <textarea
                  value={detalleUbicacion}
                  onChange={(e) => setDetalleUbicacion(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detalles Técnicos */}
        <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-sm overflow-hidden p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-800">
              Detalles Técnicos (Dinámicos)
            </h2>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              Edita los valores técnicos específicos de este activo.
            </p>
          </div>
          
          <DynamicJsonEditor 
            data={equipmentDetail} 
            onChange={setEquipmentDetail} 
          />
        </div>
      </div>
    </form>
  );
}
