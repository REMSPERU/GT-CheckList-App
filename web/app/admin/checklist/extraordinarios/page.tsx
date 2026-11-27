'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAdminSession } from '@/hooks/auth/use-admin-session';
import { getSupabaseClient } from '@/lib/supabase-browser';

interface AssetOption {
  id: string;
  codigo: string;
  id_property: string;
  property_name: string;
}

interface TechnicianOption {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface AssignmentRow {
  id: string;
  reason: string;
  start_date: string;
  end_date: string;
  asset: { codigo: string } | null;
  technician: { email: string } | null;
  response: { id: string } | null;
}

const field =
  'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
const button =
  'min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50';

async function getAssignments() {
  const { data, error } = await getSupabaseClient()
    .from('extraordinary_checklist_assignments')
    .select(
      `
      id,reason,start_date,end_date,
      asset:equipos(codigo),
      technician:users!extraordinary_checklist_assignments_technician_id_fkey(email),
      response:checklist_response(id)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(25)
    .returns<AssignmentRow[]>();
  if (error) throw new Error(error.message);
  return data;
}

export default function ExtraordinaryChecklistsPage() {
  const { user } = useAdminSession();
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const [code, setCode] = useState('');
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetId, setAssetId] = useState('');
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const propertyId = assets.find(asset => asset.id === assetId)?.id_property;

  useEffect(() => {
    if (!isSuperadmin) return;
    let active = true;
    void getAssignments()
      .then(rows => {
        if (active) setAssignments(rows);
      })
      .catch(error => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [isSuperadmin]);

  useEffect(() => {
    if (!isSuperadmin || !propertyId) return;
    let active = true;
    const supabase = getSupabaseClient();
    void (async () => {
      const { data, error } = await supabase
        .from('user_properties')
        .select('user_id,expires_at')
        .eq('property_id', propertyId);
      if (error) throw new Error(error.message);
      const ids = data
        .filter(
          row => !row.expires_at || Date.parse(row.expires_at) > Date.now(),
        )
        .map(row => row.user_id);
      if (!ids.length) {
        if (active) setMessage('El inmueble no tiene técnicos asignados.');
        return;
      }
      const result = await supabase
        .from('users')
        .select('id,email,first_name,last_name')
        .in('id', ids)
        .eq('role', 'TECNICO')
        .eq('is_active', true)
        .order('first_name')
        .returns<TechnicianOption[]>();
      if (result.error) throw new Error(result.error.message);
      if (active) {
        setTechnicians(result.data);
        if (!result.data.length)
          setMessage('El inmueble no tiene técnicos activos asignados.');
      }
    })().catch(error => {
      if (active) setMessage(error.message);
    });
    return () => {
      active = false;
    };
  }, [isSuperadmin, propertyId]);

  async function searchAsset(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setAssets([]);
    setAssetId('');
    setTechnicians([]);
    setTechnicianId('');
    setSearching(true);
    try {
      const { data, error } = await getSupabaseClient()
        .rpc('find_extraordinary_checklist_asset', { p_code: code })
        .returns<AssetOption[]>();
      if (error) throw new Error(error.message);
      setAssets(data);
      if (data.length === 1) setAssetId(data[0].id);
      if (!data.length)
        setMessage('No se encontró un activo vigente con ese código.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se pudo buscar el activo.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function assign(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { error } = await getSupabaseClient().rpc(
        'assign_extraordinary_checklist',
        {
          p_asset_id: assetId,
          p_technician_id: technicianId,
          p_reason: reason.trim(),
          p_start_date: startDate,
          p_end_date: endDate,
        },
      );
      if (error) throw new Error(error.message);
      setReason('');
      setMessage('Checklist asignado. El Técnico lo verá cuando sincronice.');
      try {
        setAssignments(await getAssignments());
      } catch {
        setMessage(
          'Checklist asignado. Actualiza la página para ver el historial.',
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo asignar el checklist.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  if (!isSuperadmin)
    return <p>Solo el Superadmin puede asignar estas inspecciones.</p>;

  return (
    <section className="grid gap-5 rounded-2xl bg-white p-5">
      <Link
        className="w-fit text-sm font-semibold text-cyan-800 underline"
        href="/admin/checklist/programaciones">
        Volver a programaciones
      </Link>
      <h1 className="text-2xl font-bold">Checklists extraordinarios</h1>
      <form
        onSubmit={searchAsset}
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1">
          Código de activo
          <input
            className={field}
            value={code}
            onChange={event => setCode(event.target.value)}
            required
          />
        </label>
        <button
          className={button}
          disabled={searching || saving || !code.trim()}>
          Buscar activo
        </button>
      </form>
      {assets.length ? (
        <form onSubmit={assign} className="grid gap-3">
          <label className="grid gap-1">
            Activo
            <select
              className={field}
              value={assetId}
              onChange={event => {
                setAssetId(event.target.value);
                setTechnicianId('');
                setTechnicians([]);
              }}
              required>
              <option value="">Seleccionar activo</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.codigo} · {asset.property_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            Técnico
            <select
              className={field}
              value={technicianId}
              onChange={event => setTechnicianId(event.target.value)}
              required>
              <option value="">Seleccionar técnico</option>
              {technicians.map(item => (
                <option key={item.id} value={item.id}>
                  {[item.first_name, item.last_name, item.email]
                    .filter(Boolean)
                    .join(' ')}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              Desde
              <input
                className={field}
                type="date"
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1">
              Hasta
              <input
                className={field}
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="grid gap-1">
            Motivo de la inspección
            <textarea
              className={field}
              value={reason}
              onChange={event => setReason(event.target.value)}
              required
              maxLength={500}
            />
          </label>
          <button
            className={`w-fit ${button}`}
            disabled={saving || !assetId || !technicianId || !reason.trim()}>
            Asignar checklist
          </button>
        </form>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="grid gap-2 border-t border-slate-200 pt-4">
        <h2 className="text-lg font-bold">Asignaciones recientes</h2>
        {assignments.length ? (
          assignments.map(row => (
            <div
              className="grid gap-1 rounded-lg border border-slate-200 p-3"
              key={row.id}>
              <strong>
                {row.asset?.codigo} · {row.technician?.email}
              </strong>
              <span>
                {row.reason} · {row.start_date} al {row.end_date}
              </span>
              {row.response ? (
                <Link
                  className="text-cyan-800 underline"
                  href={`/admin/checklist/${row.response.id}`}>
                  Ver respuesta
                </Link>
              ) : (
                <span>Pendiente</span>
              )}
            </div>
          ))
        ) : (
          <p>Aún no hay asignaciones.</p>
        )}
      </div>
    </section>
  );
}
