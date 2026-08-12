'use client';

import { startTransition, useState } from 'react';
import Link from 'next/link';
import { Settings2, Printer, ArrowLeft } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { QrConfigModal } from '@/components/admin/qr/qr-config-modal';
import { QrFilterBar } from '@/components/admin/qr/qr-filter-bar';
import { QrPrintCard } from '@/components/admin/qr/qr-print-card';
import { useAdminQr } from '@/hooks/admin/use-admin-qr';

export default function AdminEquipmentQrPage() {
  const qr = useAdminQr();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <main className="qr-print-page grid gap-5 px-6 pb-8 pt-6 lg:px-8">
      <header className="qr-print-controls flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-5">
        <div>
          <Link href="/admin/equipos" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 no-underline hover:bg-slate-50">
            <ArrowLeft size={16} aria-hidden="true" /> Activos
          </Link>
          <h1 className="m-0 mt-4 text-3xl font-extrabold tracking-[-0.03em] text-slate-950">Imprimir códigos QR</h1>
          <p className="m-0 mt-1 max-w-[58ch] text-sm text-slate-500">Prepara etiquetas identificables para los activos seleccionados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setConfigOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <Settings2 size={17} aria-hidden="true" /> Configurar
          </button>
          <button type="button" onClick={() => window.print()} disabled={!qr.propertyId || qr.items.length === 0 || qr.isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#072e27] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#05221d] disabled:cursor-not-allowed disabled:opacity-50">
            <Printer size={17} aria-hidden="true" /> Imprimir
          </button>
        </div>
      </header>

      <QrFilterBar
        search={qr.search} status={qr.status} propertyId={qr.propertyId} systemId={qr.systemId} equipmentTypeId={qr.equipmentTypeId} tipo={qr.tipo} subtipo={qr.subtipo}
        properties={qr.properties} systems={qr.systems} equipmentTypes={qr.equipmentTypes} tipos={qr.tipos} subtipos={qr.subtipos}
        onSearchChange={qr.setSearch} onStatusChange={qr.setStatus} onPropertyChange={qr.setPropertyId}
        onSystemChange={value => qr.changeScope(value, '')} onEquipmentTypeChange={value => qr.changeScope(qr.systemId, value)} onTipoChange={qr.setTipo} onSubtipoChange={qr.setSubtipo}
      />

      <Alert>{qr.errorMessage}</Alert>

      <section className="qr-print-controls flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
        <span>{!qr.propertyId ? 'Selecciona un inmueble para generar sus QRs.' : qr.isLoading ? 'Cargando QRs...' : `${qr.items.length} QRs listos para imprimir`}</span>
        {qr.propertyId && qr.items.length > 0 && <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-800">Listo</span>}
      </section>

      <section className={`qr-print-grid qr-print-size-${qr.config.printSize} grid grid-cols-4 gap-3 max-[1100px]:grid-cols-3 max-[820px]:grid-cols-2 max-[520px]:grid-cols-1`}>
        {qr.items.map(item => <QrPrintCard key={item.id} item={item} showLogo={qr.config.showLogo} logoDataUrl={qr.config.logoDataUrl} logoSize={qr.config.logoSize} printLogoSize={qr.printLogoSize} logoRadius={qr.logoRadius} />)}
      </section>

      <QrConfigModal open={configOpen} {...qr.config} onShowLogoChange={qr.setShowLogo} onLogoSizeChange={qr.setLogoSize} onLogoRadiusChange={qr.setLogoRadius} onPrintSizeChange={value => startTransition(() => qr.setPrintSize(value))} onLogoChange={qr.handleLogoChange} onRemoveLogo={qr.removeLogo} onClose={() => setConfigOpen(false)} />
    </main>
  );
}
