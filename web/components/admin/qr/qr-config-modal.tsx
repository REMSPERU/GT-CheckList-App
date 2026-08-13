'use client';

import { useEffect, useRef } from 'react';
import type { QrConfigHandlers, QrConfigState, QrLogoRadius, QrLogoSize, QrPrintSize } from './qr-types';
import Image from 'next/image';
// eslint-disable-next-line import/no-named-as-default
import QRCode from 'react-qr-code';

const LOGO_SIZE_OPTIONS: { value: QrLogoSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
];
const LOGO_RADIUS_OPTIONS: { value: QrLogoRadius; label: string }[] = [
  { value: 'square', label: 'Recto' },
  { value: 'soft', label: 'Suave' },
];
const PRINT_SIZE_OPTIONS: { value: QrPrintSize; label: string; reference: string }[] = [
  { value: 'mini', label: 'Mini', reference: '5 x 7' },
  { value: 'extra-compact', label: 'Muy compacto', reference: '5 x 6' },
  { value: 'compact', label: 'Compacto', reference: '4 x 5' },
  { value: 'normal', label: 'Normal', reference: '3 x 4' },
  { value: 'large', label: 'Grande', reference: '2 x 3' },
];
const LOGO_PREVIEW_SIZE: Record<QrLogoSize, number> = { normal: 36, large: 46 };
const LOGO_RADIUS: Record<QrLogoRadius, number> = { square: 6, soft: 14 };

interface Props extends QrConfigState, QrConfigHandlers {
  open: boolean;
}

export function QrConfigModal({ open, ...props }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoSize = LOGO_PREVIEW_SIZE[props.logoSize];
  const radius = LOGO_RADIUS[props.logoRadius];
  const { onClose } = props;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={event => event.target === event.currentTarget && props.onClose()}>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.22)]" role="dialog" aria-modal="true" aria-labelledby="qr-config-title">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div>
            <h2 id="qr-config-title" className="m-0 text-xl font-extrabold tracking-[-0.03em]">Opciones de QR</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">Ajusta la etiqueta antes de imprimir.</p>
          </div>
          <button type="button" onClick={props.onClose} aria-label="Cerrar configuración" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-xl leading-none text-slate-500 hover:bg-slate-50">×</button>
        </header>

        <div className="grid gap-3 overflow-y-auto p-5">
          <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="relative h-24 w-24 shrink-0 rounded-lg bg-white p-2 shadow-sm">
              <QRCode className="h-full w-full" level={props.showLogo ? 'H' : 'M'} value="GEMA-PREVIEW-QR" viewBox="0 0 256 256" />
              {props.showLogo && <span className="absolute left-1/2 top-1/2 grid place-items-center overflow-hidden bg-white text-[0.55rem] font-extrabold text-emerald-800" style={{ width: logoSize, height: logoSize, borderRadius: radius, transform: 'translate(-50%, -50%)', padding: props.logoDataUrl ? 0 : 3 }}>
                {props.logoDataUrl ? <Image className="h-full w-full object-contain" src={props.logoDataUrl} width={logoSize} height={logoSize} alt="Logo de vista previa" style={{ borderRadius: radius }} /> : 'GEMA'}
              </span>}
            </div>
            <div>
              <p className="m-0 text-sm font-bold">Vista previa</p>
              <p className="m-0 mt-1 text-xs text-slate-500">{props.showLogo ? (props.logoDataUrl ? 'Logo personalizado activo' : 'Logo de texto activo') : 'Sin logo en el QR'}</p>
            </div>
          </div>

          <label className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-3 text-sm font-bold">
            Mostrar logo
            <input type="checkbox" checked={props.showLogo} onChange={event => props.onShowLogoChange(event.target.checked)} className="h-5 w-5 accent-emerald-700" />
          </label>

          <QrChoiceGroup title="Tamaño de impresión" description="Columnas x filas aproximadas en hoja A4." options={PRINT_SIZE_OPTIONS} value={props.printSize} onChange={props.onPrintSizeChange} showReference />
          <QrChoiceGroup title="Tamaño del logo" options={LOGO_SIZE_OPTIONS} value={props.logoSize} onChange={props.onLogoSizeChange} />
          <QrChoiceGroup title="Esquinas del logo" options={LOGO_RADIUS_OPTIONS} value={props.logoRadius} onChange={props.onLogoRadiusChange} />

          <div className="grid gap-2 border-t border-slate-200 pt-4">
            <p className="m-0 text-sm font-bold">Imagen del logo</p>
            <p className="m-0 text-xs text-slate-500">PNG, JPG o SVG recomendado.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="min-h-11 flex-1 rounded-lg bg-[#072e27] px-4 py-2 text-sm font-bold text-white hover:bg-[#05221d]">{props.logoDataUrl ? 'Cambiar imagen' : 'Subir imagen'}</button>
              {props.logoDataUrl && <button type="button" onClick={props.onRemoveLogo} className="min-h-11 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-800 hover:bg-orange-100">Quitar</button>}
              <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={props.onLogoChange} />
            </div>
          </div>
        </div>
        <footer className="border-t border-slate-200 bg-slate-50 p-4">
          <button type="button" onClick={props.onClose} className="min-h-11 w-full rounded-lg bg-[#047857] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#065f46]">Listo</button>
        </footer>
      </div>
    </div>
  );
}

interface ChoiceGroupProps<T extends string> {
  title: string;
  description?: string;
  options: { value: T; label: string; reference?: string }[];
  value: T;
  onChange: (value: T) => void;
  showReference?: boolean;
}

function QrChoiceGroup<T extends string>({ title, description, options, value, onChange, showReference }: ChoiceGroupProps<T>) {
  return (
    <fieldset className="grid gap-2 rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      {description && <p className="m-0 text-xs text-slate-500">{description}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(option => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${value === option.value ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
          {option.label}{showReference && option.reference && <span className="block text-[0.65rem] font-medium opacity-70">{option.reference}</span>}
        </button>)}
      </div>
    </fieldset>
  );
}
