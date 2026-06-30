'use client';

import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
const QR_LOGO_SIZE_STORAGE_KEY = 'admin-equipment-qr-logo-size';
const QR_LOGO_RADIUS_STORAGE_KEY = 'admin-equipment-qr-logo-radius';
const QR_PRINT_SIZE_STORAGE_KEY = 'admin-equipment-qr-print-size';

type QrLogoSize = 'normal' | 'large';
type QrLogoRadius = 'soft' | 'square';
type QrPrintSize = 'mini' | 'extra-compact' | 'compact' | 'normal' | 'large';

const QR_LOGO_SIZE_OPTIONS: { value: QrLogoSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
];

const QR_LOGO_RADIUS_OPTIONS: { value: QrLogoRadius; label: string }[] = [
  { value: 'square', label: 'Recto' },
  { value: 'soft', label: 'Suave' },
];

const QR_PRINT_SIZE_OPTIONS: {
  value: QrPrintSize;
  label: string;
  reference: string;
}[] = [
  { value: 'mini', label: 'Mini', reference: '5 x 7' },
  { value: 'extra-compact', label: 'Muy compacto', reference: '5 x 6' },
  { value: 'compact', label: 'Compacto', reference: '4 x 5' },
  { value: 'normal', label: 'Normal', reference: '3 x 4' },
  { value: 'large', label: 'Grande', reference: '2 x 3' },
];

const QR_LOGO_PRINT_SIZE: Record<QrLogoSize, number> = {
  normal: 40,
  large: 48,
};

const QR_LOGO_PREVIEW_SIZE: Record<QrLogoSize, number> = {
  normal: 36,
  large: 46,
};

const QR_LOGO_RADIUS: Record<QrLogoRadius, number> = {
  square: 6,
  soft: 14,
};

// ---------------------------------------------------------------------------
// QR Config Modal
// ---------------------------------------------------------------------------

interface QrConfigModalProps {
  open: boolean;
  showLogo: boolean;
  logoDataUrl: string | null;
  logoSize: QrLogoSize;
  logoRadius: QrLogoRadius;
  printSize: QrPrintSize;
  onShowLogoChange: (value: boolean) => void;
  onLogoSizeChange: (value: QrLogoSize) => void;
  onLogoRadiusChange: (value: QrLogoRadius) => void;
  onPrintSizeChange: (value: QrPrintSize) => void;
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onClose: () => void;
}

function QrConfigModal({
  open,
  showLogo,
  logoDataUrl,
  logoSize,
  logoRadius,
  printSize,
  onShowLogoChange,
  onLogoSizeChange,
  onLogoRadiusChange,
  onPrintSizeChange,
  onLogoChange,
  onRemoveLogo,
  onClose,
}: QrConfigModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewLogoSize = QR_LOGO_PREVIEW_SIZE[logoSize];
  const logoBorderRadius = QR_LOGO_RADIUS[logoRadius];

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 max-[600px]:p-3"
      style={{ background: 'rgba(15,23,42,0.34)', backdropFilter: 'blur(5px)' }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-config-title"
        style={{
          background:
            'linear-gradient(180deg,#ffffff 0%,#f8fafc 72%,#eef7f2 100%)',
          boxShadow:
            '0 28px 80px rgba(15,23,42,0.22), 0 0 0 1px rgba(15,23,42,0.08)',
          animation: 'qrConfigScaleIn 0.22s ease-out',
        }}
        className="relative flex max-h-[calc(100vh-32px)] w-full max-w-[620px] flex-col overflow-hidden rounded-[28px] text-[#0c1720]">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: 0,
            background:
              'radial-gradient(circle at 8% 0%, rgba(16,185,129,0.10) 0%, transparent 48%), radial-gradient(circle at 92% 100%, rgba(14,165,233,0.08) 0%, transparent 46%)',
          }}
        />

        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between gap-4 px-6 pb-5 pt-6 max-[600px]:px-5">
          <div>
            <p
              className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.22em]"
              style={{ color: '#047857' }}>
              Configuración
            </p>
            <h2
              id="qr-config-title"
              className="m-0 text-[1.55rem] font-black tracking-[-0.05em] text-[#0c1720]">
              Opciones de QR
            </h2>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
              Ajusta la etiqueta antes de imprimir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-slate-100"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(15,23,42,0.12)',
            }}>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              width="14"
              height="14"
              stroke="#334155"
              strokeWidth="2"
              strokeLinecap="round">
              <line x1="2" y1="2" x2="14" y2="14" />
              <line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="relative grid gap-4 overflow-y-auto px-6 pb-5 max-[600px]:px-5">
          {/* Live QR Preview */}
          <div className="flex items-center gap-5 rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-sm max-[520px]:grid max-[520px]:justify-items-center max-[520px]:text-center">
            <div className="relative shrink-0">
              <div className="h-[136px] w-[136px] overflow-hidden rounded-2xl bg-white p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)] max-[520px]:h-[156px] max-[520px]:w-[156px]">
                <QRCode
                  className="h-full w-full"
                  level={showLogo ? 'H' : 'M'}
                  value="GEMA-PREVIEW-QR"
                  viewBox="0 0 256 256"
                />
              </div>
              {showLogo && (
                <span
                  className="absolute left-1/2 top-1/2 grid place-items-center overflow-hidden"
                  style={{
                    width: previewLogoSize,
                    height: previewLogoSize,
                    borderRadius: logoBorderRadius,
                    background: logoDataUrl ? 'transparent' : '#ffffff',
                    padding: logoDataUrl ? 0 : 3,
                    transform: 'translate(-50%,-50%)',
                    boxShadow: logoDataUrl
                      ? '0 2px 7px rgba(15,23,42,0.10)'
                      : '0 0 0 6px #ffffff, 0 3px 10px rgba(15,23,42,0.10)',
                  }}>
                  {logoDataUrl ? (
                    <Image
                      className="h-full w-full object-contain"
                      src={logoDataUrl}
                      width={previewLogoSize}
                      height={previewLogoSize}
                      alt="Logo preview"
                      style={{ borderRadius: logoBorderRadius }}
                    />
                  ) : (
                    <span
                      className="text-[0.62rem] font-black leading-none"
                      style={{ color: '#065f46' }}>
                      GEMA
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="m-0 text-base font-black leading-snug text-[#0c1720]">
                Vista previa
              </p>
              <p className="m-0 mt-1 text-sm font-semibold leading-snug text-slate-500">
                {showLogo
                  ? logoDataUrl
                    ? 'Logo personalizado activo'
                    : 'Logo de texto "GEMA" activo'
                  : 'Sin logo en el QR'}
              </p>
            </div>
          </div>

          {/* Toggle: mostrar logo */}
          <div className="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200/80 bg-white/75 px-4 py-3.5 shadow-sm">
            <div>
              <p className="m-0 text-sm font-black text-[#0c1720]">
                Mostrar logo
              </p>
              <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">
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
                  ? 'linear-gradient(135deg,#16a34a,#059669)'
                  : '#cbd5e1',
                boxShadow: showLogo
                  ? '0 0 0 3px rgba(16,185,129,0.16)'
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

          <div className="grid gap-3 rounded-[20px] border border-slate-200/80 bg-white/75 p-3.5 shadow-sm">
            <div>
              <p className="m-0 text-sm font-black text-[#0c1720]">
                Tamaño de impresión
              </p>
              <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">
                El número indica columnas x filas aproximadas en hoja A4.
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2 max-[620px]:grid-cols-2 max-[420px]:grid-cols-1">
              {QR_PRINT_SIZE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPrintSizeChange(option.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-black transition-colors"
                  style={{
                    background:
                      printSize === option.value ? '#dcfce7' : '#ffffff',
                    borderColor:
                      printSize === option.value ? '#86efac' : '#e2e8f0',
                    color: printSize === option.value ? '#166534' : '#475569',
                  }}>
                  <span className="block">{option.label}</span>
                  <span className="mt-0.5 block text-[0.64rem] opacity-75">
                    {option.reference}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-[20px] border border-slate-200/80 bg-white/75 p-3.5 shadow-sm">
            <div>
              <p className="m-0 text-sm font-black text-[#0c1720]">
                Tamaño del logo
              </p>
              <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">
                Usa grande si el logo se ve pequeño en la impresión.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QR_LOGO_SIZE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onLogoSizeChange(option.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-black transition-colors"
                  style={{
                    background:
                      logoSize === option.value ? '#dcfce7' : '#ffffff',
                    borderColor:
                      logoSize === option.value ? '#86efac' : '#e2e8f0',
                    color: logoSize === option.value ? '#166534' : '#475569',
                  }}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-[20px] border border-slate-200/80 bg-white/75 p-3.5 shadow-sm">
            <div>
              <p className="m-0 text-sm font-black text-[#0c1720]">
                Esquinas del logo
              </p>
              <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">
                Recto reduce el efecto muy redondeado.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QR_LOGO_RADIUS_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onLogoRadiusChange(option.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-black transition-colors"
                  style={{
                    background:
                      logoRadius === option.value ? '#dcfce7' : '#ffffff',
                    borderColor:
                      logoRadius === option.value ? '#86efac' : '#e2e8f0',
                    color: logoRadius === option.value ? '#166534' : '#475569',
                  }}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo upload section */}
          <div className="grid gap-2">
            <p className="m-0 text-[0.72rem] font-black uppercase tracking-[0.15em] text-slate-500">
              Imagen del logo
            </p>

            {/* Current logo preview */}
            <div className="flex items-center gap-3 rounded-[20px] border border-slate-200/80 bg-white/75 p-3 shadow-sm">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl overflow-hidden bg-white"
                style={{ boxShadow: '0 5px 16px rgba(15,23,42,0.12)' }}>
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
                <p className="m-0 truncate text-sm font-black text-[#0c1720]">
                  {logoDataUrl
                    ? 'Logo personalizado'
                    : 'Sin imagen · usando "GEMA"'}
                </p>
                <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">
                  PNG, JPG, SVG recomendado
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-xl py-2.5 text-sm font-black transition-all"
                style={{
                  background: 'linear-gradient(135deg,#047857,#059669)',
                  border: '1px solid rgba(4,120,87,0.18)',
                  color: '#ffffff',
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(135deg,#065f46,#047857)')
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(135deg,#047857,#059669)')
                }>
                {logoDataUrl ? 'Cambiar imagen' : 'Subir imagen'}
              </button>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  className="rounded-xl px-4 py-2.5 text-sm font-black transition-all"
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    color: '#9a3412',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      '#ffedd5';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      '#7c2d12';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      '#fff7ed';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      '#9a3412';
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

        <div className="relative shrink-0 border-t border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur max-[600px]:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-emerald-800">
            Listo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes qrConfigScaleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
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
      width="18"
      height="18"
      aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
      />
    </svg>
  );
}

interface QrPrintCardProps {
  item: AdminEquipmentQrRow;
  shouldShowLogo: boolean;
  qrLogoDataUrl: string | null;
  qrLogoSize: QrLogoSize;
  printLogoSize: number;
  logoBorderRadius: number;
}

const QrPrintCard = memo(function QrPrintCard({
  item,
  shouldShowLogo,
  qrLogoDataUrl,
  qrLogoSize,
  printLogoSize,
  logoBorderRadius,
}: QrPrintCardProps) {
  return (
    <article className="qr-print-card grid justify-items-center gap-3 rounded-[18px] border border-dashed border-slate-300 bg-white p-4 text-center shadow-sm">
      <div className="qr-print-code relative h-auto w-full max-w-[150px]">
        <QRCode
          className="h-auto w-full"
          level={shouldShowLogo ? 'H' : 'M'}
          value={item.codigo}
          viewBox="0 0 256 256"
        />
        {shouldShowLogo ? (
          <span
            className={`qr-print-logo qr-logo-size-${qrLogoSize} grid place-items-center overflow-hidden text-[0.58rem] font-black tracking-[-0.04em] text-emerald-800`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: printLogoSize,
              height: printLogoSize,
              borderRadius: logoBorderRadius,
              background: qrLogoDataUrl ? 'transparent' : '#ffffff',
              boxShadow: qrLogoDataUrl
                ? '0 2px 7px rgba(15,23,42,0.10)'
                : '0 0 0 5px #ffffff, 0 2px 8px rgba(15,23,42,0.10)',
              padding: qrLogoDataUrl ? 0 : 3,
            }}>
            {qrLogoDataUrl ? (
              <Image
                className="h-full w-full object-contain"
                src={qrLogoDataUrl}
                width={printLogoSize}
                height={printLogoSize}
                alt="Logo"
                style={{ borderRadius: logoBorderRadius }}
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
  );
});

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
  const [qrLogoSize, setQrLogoSize] = useState<QrLogoSize>('large');
  const [qrLogoRadius, setQrLogoRadius] = useState<QrLogoRadius>('square');
  const [qrPrintSize, setQrPrintSize] = useState<QrPrintSize>('normal');
  const [configOpen, setConfigOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    setQrLogoDataUrl(localStorage.getItem(QR_LOGO_STORAGE_KEY));

    const storedLogoSize = localStorage.getItem(QR_LOGO_SIZE_STORAGE_KEY);
    if (storedLogoSize === 'normal' || storedLogoSize === 'large') {
      setQrLogoSize(storedLogoSize);
    }

    const storedLogoRadius = localStorage.getItem(QR_LOGO_RADIUS_STORAGE_KEY);
    if (storedLogoRadius === 'soft' || storedLogoRadius === 'square') {
      setQrLogoRadius(storedLogoRadius);
    }

    const storedPrintSize = localStorage.getItem(QR_PRINT_SIZE_STORAGE_KEY);
    if (
      storedPrintSize === 'mini' ||
      storedPrintSize === 'extra-compact' ||
      storedPrintSize === 'compact' ||
      storedPrintSize === 'normal' ||
      storedPrintSize === 'large'
    ) {
      setQrPrintSize(storedPrintSize);
    } else if (storedPrintSize === 'extraCompact') {
      setQrPrintSize('extra-compact');
      localStorage.setItem(QR_PRINT_SIZE_STORAGE_KEY, 'extra-compact');
    }
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
      { value: '', label: 'Todas las especialidades' },
      ...systems.map(item => ({ value: item.id, label: item.nombre })),
    ],
    [systems],
  );

  const equipmentTypeOptions = useMemo(() => {
    const filteredTypes = systemId
      ? equipmentTypes.filter(item => item.systemId === systemId)
      : equipmentTypes;

    return [
      { value: '', label: 'Todos los tipos de activo' },
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

  function handleLogoSizeChange(nextLogoSize: QrLogoSize) {
    setQrLogoSize(nextLogoSize);
    localStorage.setItem(QR_LOGO_SIZE_STORAGE_KEY, nextLogoSize);
  }

  function handleLogoRadiusChange(nextLogoRadius: QrLogoRadius) {
    setQrLogoRadius(nextLogoRadius);
    localStorage.setItem(QR_LOGO_RADIUS_STORAGE_KEY, nextLogoRadius);
  }

  function handlePrintSizeChange(nextPrintSize: QrPrintSize) {
    startTransition(() => {
      setQrPrintSize(nextPrintSize);
    });
    localStorage.setItem(QR_PRINT_SIZE_STORAGE_KEY, nextPrintSize);
  }

  const shouldShowLogo = showLogo;
  const printLogoSize = QR_LOGO_PRINT_SIZE[qrLogoSize];
  const logoBorderRadius = QR_LOGO_RADIUS[qrLogoRadius];

  return (
    <main className="qr-print-page grid gap-4 px-8 pb-8 pt-4 max-[640px]:px-[14px]">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="qr-print-controls flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-[#0c1720] no-underline transition-colors hover:bg-slate-200"
            href="/admin/equipos">
            ← Volver a activos
          </Link>
          <h1 className="m-0 mt-3 text-2xl font-black tracking-[-0.04em] text-[#0c1720]">
            QRs de activos
          </h1>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">
            Cada QR contiene el código. La impresión agrega tipo y ubicación
            como referencia.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Config gear button */}
          <button
            id="qr-config-btn"
            type="button"
            onClick={() => setConfigOpen(true)}
            aria-label="Configuración de QR"
            title="Configuración de QR"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-900 shadow-sm transition-all hover:bg-emerald-100 hover:shadow-md max-[420px]:w-full"
            style={{
              color: configOpen ? '#065f46' : '#0f5132',
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
            Configurar QR
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
          ariaLabel="Filtrar por especialidad"
        />
        <SelectField
          value={equipmentTypeId}
          options={equipmentTypeOptions}
          onChange={setEquipmentTypeId}
          ariaLabel="Filtrar por tipo de activo"
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
      <section
        className={`qr-print-grid qr-print-size-${qrPrintSize} grid grid-cols-4 gap-3 max-[1100px]:grid-cols-3 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1`}>
        {items.map(item => (
          <QrPrintCard
            key={item.id}
            item={item}
            shouldShowLogo={shouldShowLogo}
            qrLogoDataUrl={qrLogoDataUrl}
            qrLogoSize={qrLogoSize}
            printLogoSize={printLogoSize}
            logoBorderRadius={logoBorderRadius}
          />
        ))}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* QR Config Modal                                                     */}
      {/* ------------------------------------------------------------------ */}
      <QrConfigModal
        open={configOpen}
        showLogo={showLogo}
        logoDataUrl={qrLogoDataUrl}
        logoSize={qrLogoSize}
        logoRadius={qrLogoRadius}
        printSize={qrPrintSize}
        onShowLogoChange={setShowLogo}
        onLogoSizeChange={handleLogoSizeChange}
        onLogoRadiusChange={handleLogoRadiusChange}
        onPrintSizeChange={handlePrintSizeChange}
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
