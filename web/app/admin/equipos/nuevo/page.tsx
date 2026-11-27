'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { SearchableSelectField } from '@/components/ui/searchable-select-field';
import { SelectField } from '@/components/ui/select-field';
import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { UBICACION_OPTIONS } from '@/lib/ubicacion';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import { listAdminEquipmentProperties } from '@/services/admin/properties.service';
import type { AdminEquipmentTypeRow, AdminPropertyRow } from '@/types/admin';
import { getGemaPermissions } from '../../../../../types/gema-role';

export default function NewEquipmentPage() {
  const router = useRouter();
  const { user, isCheckingSession } = useAdminSession();
  const canCreate = getGemaPermissions(user?.role ?? null).canManageAssets;
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [types, setTypes] = useState<AdminEquipmentTypeRow[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canCreate) return;
    let active = true;
    const client = getSupabaseClient();
    void Promise.all([listAdminEquipmentProperties(client), listAdminEquipmentTypes(client)])
      .then(([propertyRows, typeRows]) => {
        if (active) { setProperties(propertyRows); setTypes(typeRows); }
      })
      .catch(() => { if (active) setError('No se pudo cargar el catálogo de activos.'); });
    return () => { active = false; };
  }, [canCreate]);

  if (isCheckingSession) return <p className="p-6">Cargando…</p>;
  if (!canCreate) return <p className="p-6">Tu rol no permite registrar activos.</p>;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data: id, error: failure } = await getSupabaseClient().rpc('create_gema_web_equipment', {
        p_property_id: propertyId, p_equipment_type_id: typeId, p_code: code,
        p_location: location, p_location_detail: detail,
      });
      if (failure) throw failure;
      router.push(`/admin/equipos/${id}/edit`);
    } catch (failure) {
      setError(typeof failure === 'object' && failure !== null && 'message' in failure
        ? String(failure.message) : 'No se pudo registrar el activo.');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-4 p-6">
      <h1 className="text-xl font-bold text-slate-900">Nuevo activo</h1>
      <Alert>{error}</Alert>
      <form onSubmit={save} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="grid gap-1 text-sm font-semibold">
          Inmueble
          <SearchableSelectField
            value={propertyId} onChange={setPropertyId} ariaLabel="Inmueble del activo"
            placeholder="Selecciona un inmueble"
            options={properties.map(item => ({ value: item.id, label: item.name }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Tipo de activo
          <SearchableSelectField
            value={typeId} onChange={setTypeId} ariaLabel="Tipo de activo"
            placeholder="Selecciona un tipo"
            options={types.map(type => ({ value: type.id, label: `${type.systemName} · ${type.nombre}` }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Código de inventario
          <input className="min-h-11 rounded-lg border border-slate-300 px-3"
            required minLength={3} maxLength={50} value={code}
            onChange={event => setCode(event.target.value.toUpperCase())} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Ubicación
          <SelectField value={location} onChange={setLocation} ariaLabel="Ubicación"
            options={[{ value: '', label: 'Selecciona una ubicación' }, ...UBICACION_OPTIONS]} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Detalle de ubicación
          <input className="min-h-11 rounded-lg border border-slate-300 px-3"
            maxLength={200} value={detail} onChange={event => setDetail(event.target.value)} />
        </label>
        <div className="flex items-center justify-between">
          <Link href="/admin/equipos" className="text-sm font-semibold text-slate-700">Cancelar</Link>
          <button type="submit" disabled={submitting || !propertyId || !typeId || !location}
            className="rounded-lg bg-[#072e27] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {submitting ? 'Registrando…' : 'Registrar activo'}
          </button>
        </div>
      </form>
    </main>
  );
}
