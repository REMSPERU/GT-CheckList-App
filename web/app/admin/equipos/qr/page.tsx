'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'react-qr-code';

import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SelectField } from '@/components/ui/select-field';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import { listAdminEquipmentsForQr } from '@/services/admin/equipments.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type {
  AdminEquipmentQrRow,
  AdminEquipmentTypeRow,
  AdminPropertyRow,
} from '@/types/admin';
import { useDebouncedValue } from '@/hooks/admin/use-debounced-value';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

const QR_LOGO_STORAGE_KEY = 'admin-equipment-qr-logo';

// ---------------------------------------------------------------------------
// QR Config Modal
// ---------------------------------------------------------------------------

interface QrConfigModalProps {
  open: boolean;
  showLogo: boolean;
  logoDataUrl: string | null;
  onShowLogoChange: (value: boolean) => void;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onClose: () => void;
}

function QrConfigModal({
  open,
  showLogo,
  logoDataUrl,
  onShowLogoChange,
  onLogoChange,
  onRemoveLogo,
  onClose,
}: QrConfigModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-6 max-[600px]:items-center max-[600px]:justify-center"
      style={{ background: 'rgba(6,23,17,0.42)', backdropFilter: 'blur(4px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-config-title"
        style={{
          background:
            'linear-gradient(160deg,#072920 0%,#0b1f28 80%,#061812 100%)',
          boxShadow:
            '0 32px 80px rgba(2,18,14,0.52), 0 0 0 1px rgba(255,255,255,0.08)',
          animation: 'qrConfigSlideIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        className="relative w-full max-w-[400px] overflow-hidden rounded-[24px] text-white">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: 0,
            background:
              'radial-gradient(circle at 10% 0%, rgba(190,242,100,0.18) 0%, transparent 55%), radial-gradient(circle at 90% 100%, rgba(6,120,80,0.2) 0%, transparent 50%)',
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <p
              className="mb-0.5 text-[0.65rem] font-black uppercase tracking-[0.22em]"
              style={{ color: '#b6f27a' }}>
              Configuración
            </p>
            <h2
              id="qr-config-title"
              className="m-0 text-[1.25rem] font-black tracking-[-0.05em] text-white">
              Opciones de QR
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="grid h-9 w-9 place-items-center rounded-full transition-colors"
            style={{
              background: 'rgba(255,255,255,0.09)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                'rgba(255,255,255,0.18)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                'rgba(255,255,255,0.09)')
            }>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              width="14"
              height="14"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round">
              <line x1="2" y1="2" x2="14" y2="14" />
              <line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="relative px-5 pb-5 grid gap-4">
          {/* Live QR Preview */}
          <div
            className="flex items-center gap-4 rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="relative shrink-0">
              <div className="h-[72px] w-[72px] rounded-xl overflow-hidden bg-white p-1.5">
                <QRCode
                  className="h-full w-full"
                  level={showLogo ? 'H' : 'M'}
                  value="GEMA-PREVIEW-QR"
                  viewBox="0 0 256 256"
                />
              </div>
              {showLogo && (
                <span
                  className="absolute left-1/2 top-1/2 grid place-items-center rounded-lg overflow-hidden bg-white"
                  style={{
                    width: 20,
                    height: 20,
                    transform: 'translate(-50%,-50%)',
                    boxShadow: '0 0 0 3px rgba(255,255,255,0.95)',
                  }}>
                  {logoDataUrl ? (
                    <Image
                      className="h-full w-full object-contain p-0.5"
                      src={logoDataUrl}
                      width={20}
                      height={20}
                      alt="Logo preview"
                    />
                  ) : (
                    <span
                      className="text-[0.38rem] font-black leading-none"
                      style={{ color: '#065f46' }}>
                      GEMA
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[0.72rem] font-black text-white/90 leading-snug">
                Vista previa
              </p>
              <p className="m-0 text-[0.65rem] font-semibold text-white/50 leading-snug mt-0.5">
                {showLogo
                  ? logoDataUrl
                    ? 'Logo personalizado activo'
                    : 'Logo de texto "GEMA" activo'
                  : 'Sin logo en el QR'}
              </p>
            </div>
          </div>

          {/* Toggle: mostrar logo */}
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div>
              <p className="m-0 text-[0.8rem] font-black text-white">
                Mostrar logo
              </p>
              <p className="m-0 text-[0.67rem] font-semibold text-white/50 mt-0.5">
                Incrustar logo en el centro del QR
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showLogo}
              onClick={() => onShowLogoChange(!showLogo)}
              className="relative shrink-0 rounded-full transition-all duration-200"
              style={{
                width: 44,
                height: 24,
                background: showLogo
                  ? 'linear-gradient(135deg,#65d97b,#34c85a)'
                  : 'rgba(255,255,255,0.15)',
                boxShadow: showLogo
                  ? '0 0 0 2px rgba(101,217,123,0.35)'
                  : 'none',
              }}>
              <span
                className="absolute top-[3px] rounded-full bg-white shadow transition-all duration-200"
                style={{
                  width: 18,
                  height: 18,
                  left: showLogo ? 'calc(100% - 21px)' : 3,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.30)',
                }}
              />
            </button>
          </div>

          {/* Logo upload section */}
          <div className="grid gap-2">
            <p className="m-0 text-[0.72rem] font-black uppercase tracking-[0.15em] text-white/40">
              Imagen del logo
            </p>

            {/* Current logo preview */}
            <div
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl overflow-hidden bg-white"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                {logoDataUrl ? (
                  <Image
                    className="h-full w-full object-contain p-1"
                    src={logoDataUrl}
                    width={48}
                    height={48}
                    alt="Logo actual"
                  />
                ) : (
                  <span
                    className="text-[0.5rem] font-black tracking-[-0.04em]"
                    style={{ color: '#065f46' }}>
                    GEMA
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[0.75rem] font-black text-white/80 truncate">
                  {logoDataUrl ? 'Logo personalizado' : 'Sin imagen · usando "GEMA"'}
                </p>
                <p className="m-0 text-[0.65rem] font-semibold text-white/40 mt-0.5">
                  PNG, JPG, SVG recomendado
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-xl py-2.5 text-[0.78rem] font-black transition-all"
                style={{
                  background: 'linear-gradient(135deg,#1a6641,#0d4a31)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#b6f27a',
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(135deg,#22834f,#115a3b)')
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(135deg,#1a6641,#0d4a31)')
                }>
                {logoDataUrl ? 'Cambiar imagen' : 'Subir imagen'}
              </button>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  className="rounded-xl px-4 py-2.5 text-[0.78rem] font-black transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(239,68,68,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      '#fca5a5';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'rgba(255,255,255,0.55)';
                  }}>
                  Quitar
                </button>
              )}
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="image/*"
                onChange={onLogoChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in animation keyframes */}
      <style>{`
        @keyframes qrConfigSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gear Icon SVG
// ---------------------------------------------------------------------------

function GearIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminEquipmentQrPage() {
  const [items, setItems] = useState<AdminEquipmentQrRow[]>([]);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [systems, setSystems] = useState<{ id: string; nombre: string }[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVO');
  const [propertyId, setPropertyId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');

  // QR config
  const [showLogo, setShowLogo] = useState(true);
  const [qrLogoDataUrl, setQrLogoDataUrl] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    setQrLogoDataUrl(localStorage.getItem(QR_LOGO_STORAGE_KEY));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        const supabase = getSupabaseClient();
        const [propertyRows, typeRows, systemResult] = await Promise.all([
          listAdminProperties(supabase),
          listAdminEquipmentTypes(supabase),
          supabase
            .from('sistemas')
            .select('id, nombre')
            .order('nombre', { ascending: true }),
        ]);

        if (!isMounted) return;

        setProperties(propertyRows);
        setEquipmentTypes(typeRows);
        setSystems(
          (systemResult.data ?? []) as { id: string; nombre: string }[],
        );
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los filtros',
          );
        }
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQrItems() {
      if (!propertyId) {
        setItems([]);
        setIsLoading(false);
        setErrorMessage(null);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const rows = await listAdminEquipmentsForQr(supabase, {
          search: debouncedSearch,
          status,
          propertyId,
          systemId,
          equipmentTypeId,
        });

        if (isMounted) {
          setItems(rows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los QRs',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadQrItems();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, equipmentTypeId, propertyId, status, systemId]);

  const propertyOptions = useMemo(
    () => [
      { value: '', label: 'Todos los inmuebles' },
      ...properties.map(item => ({ value: item.id, label: item.name })),
    ],
    [properties],
  );

  const systemOptions = useMemo(
    () => [
      { value: '', label: 'Todos los sistemas' },
      ...systems.map(item => ({ value: item.id, label: item.nombre })),
    ],
    [systems],
  );

  const equipmentTypeOptions = useMemo(() => {
    const filteredTypes = systemId
      ? equipmentTypes.filter(item => item.systemId === systemId)
      : equipmentTypes;

    return [
      { value: '', label: 'Todos los tipos de equipo' },
      ...filteredTypes.map(item => ({ value: item.id, label: item.nombre })),
    ];
  }, [equipmentTypes, systemId]);

  function handleSystemChange(nextSystemId: string) {
    setSystemId(nextSystemId);
    setEquipmentTypeId('');
  }

  function handleQrLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Selecciona una imagen valida para el logo.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;

      setQrLogoDataUrl(reader.result);
      localStorage.setItem(QR_LOGO_STORAGE_KEY, reader.result);
      setShowLogo(true);
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('No se pudo leer la imagen del logo.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function handleRemoveQrLogo() {
    setQrLogoDataUrl(null);
    localStorage.removeItem(QR_LOGO_STORAGE_KEY);
  }

  const shouldShowLogo = showLogo;

  return (
    <main className="grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="qr-print-controls flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-[#0c1720] no-underline transition-colors hover:bg-slate-200"
            href="/admin/equipos">
            ← Volver a equipos
          </Link>
          <h1 className="m-0 mt-3 text-2xl font-black tracking-[-0.04em] text-[#0c1720]">
            QRs de equipos
          </h1>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
            Cada QR contiene el código. La impresión agrega tipo y ubicación como referencia.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Config gear button */}
          <button
            id="qr-config-btn"
            type="button"
            onClick={() => setConfigOpen(true)}
            aria-label="Configuración de QR"
            title="Configuración de QR"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
            style={{
              color: configOpen ? '#065f46' : '#334155',
            }}>
            {/* Animated gear */}
            <span
              style={{
                display: 'inline-block',
                transition: 'transform 0.4s ease',
              }}
              className="qr-gear-icon">
              <GearIcon />
            </span>
          </button>

          {/* Print button */}
          <button
            className="rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-[#0c1720] disabled:cursor-not-allowed disabled:opacity-55"
            type="button"
            onClick={() => window.print()}
            disabled={!propertyId || items.length === 0 || isLoading}>
            Imprimir
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="qr-print-controls grid grid-cols-[1.2fr_1fr_1fr_1.2fr_0.8fr] gap-2.5 max-[1100px]:grid-cols-3 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
        <SearchInput
          placeholder="Buscar codigo o ubicacion"
          value={search}
          onChange={setSearch}
        />
        <SearchableSelect
          value={propertyId}
          options={propertyOptions}
          onChange={setPropertyId}
          placeholder="Todos los inmuebles"
        />
        <SelectField
          value={systemId}
          options={systemOptions}
          onChange={handleSystemChange}
          ariaLabel="Filtrar por sistema"
        />
        <SelectField
          value={equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={setEquipmentTypeId}
          ariaLabel="Filtrar por tipo de equipo"
        />
        <SelectField
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
          ariaLabel="Filtrar por estado"
        />
      </section>

      <Alert>{errorMessage}</Alert>

      {/* ------------------------------------------------------------------ */}
      {/* Count info bar                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="qr-print-controls rounded-[18px] border border-slate-900/10 bg-white/80 px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
        {!propertyId
          ? 'Selecciona un inmueble para generar sus QRs.'
          : isLoading
            ? 'Cargando QRs...'
            : `${items.length} QRs listos para imprimir`}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* QR Grid                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="qr-print-grid grid grid-cols-4 gap-3 max-[1100px]:grid-cols-3 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1">
        {items.map(item => (
          <article
            className="qr-print-card grid justify-items-center gap-3 rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-center shadow-sm"
            key={item.id}>
            <div className="qr-print-code relative h-auto w-full max-w-[150px]">
              <QRCode
                className="h-auto w-full"
                level={shouldShowLogo ? 'H' : 'M'}
                value={item.codigo}
                viewBox="0 0 256 256"
              />
              {shouldShowLogo ? (
                <span className="qr-print-logo absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border border-slate-200 bg-white text-[0.58rem] font-black tracking-[-0.04em] text-emerald-800 shadow-[0_0_0_4px_rgba(255,255,255,0.96)]">
                  {qrLogoDataUrl ? (
                    <Image
                      className="h-full w-full object-contain p-1"
                      src={qrLogoDataUrl}
                      width={40}
                      height={40}
                      alt="Logo"
                    />
                  ) : (
                    'GEMA'
                  )}
                </span>
              ) : null}
            </div>
            <span className="qr-print-id break-all font-mono text-[0.68rem] font-black leading-snug text-[#0c1720]">
              {item.codigo}
            </span>
            <div className="qr-print-meta grid gap-1 text-center text-[0.62rem] font-semibold leading-tight text-slate-500">
              <span>{item.equipmentName}</span>
              <span>
                {[item.ubicacion, item.detalle_ubicacion]
                  .filter(Boolean)
                  .join(' · ') || '-'}
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* QR Config Modal                                                     */}
      {/* ------------------------------------------------------------------ */}
      <QrConfigModal
        open={configOpen}
        showLogo={showLogo}
        logoDataUrl={qrLogoDataUrl}
        onShowLogoChange={setShowLogo}
        onLogoChange={handleQrLogoChange}
        onRemoveLogo={handleRemoveQrLogo}
        onClose={() => setConfigOpen(false)}
      />

      {/* Gear spin animation */}
      <style>{`
        #qr-config-btn:hover .qr-gear-icon {
          transform: rotate(30deg);
        }
      `}</style>
    </main>
  );
}
