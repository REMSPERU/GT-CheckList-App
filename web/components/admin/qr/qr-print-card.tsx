'use client';

import { memo } from 'react';
import Image from 'next/image';
// eslint-disable-next-line import/no-named-as-default
import QRCode from 'react-qr-code';
import { formatUbicacion } from '@/lib/ubicacion';
import type { AdminEquipmentQrRow } from '@/types/admin';
import type { QrLogoSize } from './qr-types';

interface Props {
  item: AdminEquipmentQrRow;
  showLogo: boolean;
  logoDataUrl: string | null;
  logoSize: QrLogoSize;
  printLogoSize: number;
  logoRadius: number;
}

export const QrPrintCard = memo(function QrPrintCard({ item, showLogo, logoDataUrl, logoSize, printLogoSize, logoRadius }: Props) {
  return (
    <article className="qr-print-card grid justify-items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="qr-print-code relative h-auto w-full max-w-[150px]">
        <QRCode className="h-auto w-full" level={showLogo ? 'H' : 'M'} value={item.codigo} viewBox="0 0 256 256" />
        {showLogo && <span className={`qr-print-logo qr-logo-size-${logoSize} absolute left-1/2 top-1/2 grid place-items-center overflow-hidden text-[0.58rem] font-extrabold text-emerald-800`} style={{ width: printLogoSize, height: printLogoSize, borderRadius: logoRadius, background: logoDataUrl ? 'transparent' : '#ffffff', transform: 'translate(-50%, -50%)', padding: logoDataUrl ? 0 : 3 }}>
          {logoDataUrl ? <Image className="h-full w-full object-contain" src={logoDataUrl} width={printLogoSize} height={printLogoSize} alt="Logo" style={{ borderRadius: logoRadius }} /> : 'GEMA'}
        </span>}
      </div>
      <span className="qr-print-id break-all font-mono text-[0.68rem] font-extrabold leading-snug text-slate-950">{item.codigo}</span>
      <div className="qr-print-meta grid gap-1 text-center text-[0.62rem] font-semibold leading-tight text-slate-500">
        <span>{item.equipmentName}</span>
        <span>{[formatUbicacion(item.ubicacion), item.detalle_ubicacion].filter(Boolean).join(' · ') || '-'}</span>
      </div>
    </article>
  );
});
