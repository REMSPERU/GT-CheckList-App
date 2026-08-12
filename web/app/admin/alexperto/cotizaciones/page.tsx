'use client';

import { Suspense, useState } from 'react';

import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import {
  QuoteAuditDrawer,
  QuoteItem,
} from '@/components/admin/alexperto/quote-audit-drawer';
import {
  Receipt,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const SPECIALTY_OPTIONS = [
  { value: '', label: 'Todas las especialidades' },
  { value: 'climatizacion', label: 'Climatización y HVAC' },
  { value: 'servicios_generales', label: 'Servicios generales' },
  { value: 'electricidad', label: 'Tableros e Instalaciones Eléctricas' },
  { value: 'sanitarias', label: 'Instalaciones Sanitarias' },
  { value: 'seguridad', label: 'Sistema Contra Incendio y Seguridad' },
];

const GEMA_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados internos' },
  { value: 'PENDIENTE_REVISION', label: 'Pendiente de Revisión' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'CULMINADO', label: 'Culminado' },
  { value: 'PENDIENTE_VALIDACION', label: 'Pendiente de Validación' },
  { value: 'VALIDADO', label: 'Validado' },
];

const INITIAL_QUOTES: QuoteItem[] = [
  {
    id: '69gm0n6uqi68yf9rfmajmz',
    code: 'CO-7756',
    propertyName: 'PANORAMA CENTRO EMPRESARIAL DOS',
    specialty: 'Climatización y HVAC',
    subSpecialty: 'Sistema de aire acondicionado',
    externalStatus: 'PENDING',
    gemaStatus: 'PENDIENTE_REVISION',
    amount: 4850.0,
    createdAt: '2026-08-12T17:43:54.913Z',
    hasBeenReviewed: false,
    provider: 'Servicios de Climatización Perú S.A.C.',
  },
  {
    id: 'hbfqjuezxrh79wqqmu9lbh',
    code: 'CO-7755',
    propertyName: 'PANORAMA CENTRO EMPRESARIAL DOS',
    specialty: 'Climatización y HVAC',
    subSpecialty: 'Sistema de aire acondicionado',
    externalStatus: 'PENDING',
    gemaStatus: 'OBSERVADO',
    amount: 12500.0,
    createdAt: '2026-08-12T17:43:12.831Z',
    hasBeenReviewed: true,
    provider: 'Multiservicios HVAC E.I.R.L.',
  },
  {
    id: 'thehgyqtnb4l4wzverjm6i',
    code: 'CO-7752',
    propertyName: 'CENTRO EMPRESARIAL BASADRE (ESTAC.)',
    specialty: 'Servicios generales',
    subSpecialty: 'Jardinería',
    externalStatus: 'PENDING',
    gemaStatus: 'CULMINADO',
    amount: 3200.0,
    createdAt: '2026-08-12T17:38:19.585Z',
    hasBeenReviewed: true,
    provider: 'Paisajismo Verde Jardines S.A.C.',
  },
  {
    id: 'gf1zugd0csc53fhyvva155',
    code: 'CO-7747',
    propertyName: 'PANORAMA CENTRO EMPRESARIAL UNO',
    specialty: 'Climatización y HVAC',
    subSpecialty: 'Sistema de aire acondicionado',
    externalStatus: 'PENDING',
    gemaStatus: 'PENDIENTE_REVISION',
    amount: 8900.0,
    createdAt: '2026-08-12T17:05:11.768Z',
    hasBeenReviewed: false,
    provider: 'Ingeniería Térmica & Frío S.A.',
  },
];

function CotizacionesContent() {
  const [quotes, setQuotes] = useState<QuoteItem[]>(INITIAL_QUOTES);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedGemaStatus, setSelectedGemaStatus] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<QuoteItem | null>(null);

  const filteredQuotes = quotes.filter(q => {
    if (minAmountFilter && q.amount < 3000) return false;
    if (
      search &&
      !q.code.toLowerCase().includes(search.toLowerCase()) &&
      !q.propertyName.toLowerCase().includes(search.toLowerCase()) &&
      !q.provider.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (selectedGemaStatus && q.gemaStatus !== selectedGemaStatus) return false;
    return true;
  });

  const handleStatusUpdate = (quoteId: string, newStatus: string) => {
    setQuotes(prev =>
      prev.map(q => (q.id === quoteId ? { ...q, gemaStatus: newStatus } : q))
    );
  };

  const getGemaBadge = (status: string) => {
    switch (status) {
      case 'CULMINADO':
      case 'VALIDADO':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Culminado
          </span>
        );
      case 'OBSERVADO':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            <AlertCircle size={13} className="text-amber-600" />
            Observado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <Clock size={13} className="text-slate-500" />
            Pendiente de Revisión
          </span>
        );
    }
  };

  const pendingCount = quotes.filter(q => q.gemaStatus === 'PENDIENTE_REVISION').length;

  return (
    <main className="grid gap-6 px-6 lg:px-8 py-6">
      {/* HEADER & SUMMARY KPIS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Cotizaciones Alexperto
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Receipt size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 m-0 mt-1">7,692</p>
          <span className="text-[11px] text-slate-500 font-medium">
            Total registradas en el sistema
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Relevantes (&gt; S/ 3,000)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Filter size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 m-0 mt-1">
            {filteredQuotes.length}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Monto mayor al umbral de auditoría
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pendientes GEMA
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-900 m-0 mt-1">
            {pendingCount}
          </p>
          <span className="text-[11px] text-amber-700/80 font-medium">
            Por revisar por el auditor
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Inmuebles Mapeados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 m-0 mt-1">67 / 68</p>
          <span className="text-[11px] text-emerald-700 font-medium">
            98.5% verificados con Alexperto
          </span>
        </div>
      </section>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,1.5fr)_minmax(200px,1fr)_minmax(200px,1fr)_auto] gap-3 items-center">
          <SearchInput
            placeholder="Buscar por código (CO-XXXX), inmueble o proveedor..."
            value={search}
            onChange={setSearch}
          />

          <SelectField
            value={selectedSpecialty}
            options={SPECIALTY_OPTIONS}
            onChange={setSelectedSpecialty}
            ariaLabel="Filtrar por especialidad"
          />

          <SelectField
            value={selectedGemaStatus}
            options={GEMA_STATUS_OPTIONS}
            onChange={setSelectedGemaStatus}
            ariaLabel="Filtrar por estado interno GEMA"
          />

          <button
            type="button"
            onClick={() => setMinAmountFilter(prev => !prev)}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-semibold transition ${
              minAmountFilter
                ? 'border-emerald-800 bg-emerald-950 text-white shadow-2xs'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            <Sparkles size={14} className={minAmountFilter ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Filtro &gt; S/ 3,000</span>
          </button>
        </div>
      </section>

      {/* DATA TABLE / LISTING */}
      <section className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3.5">Código</th>
                <th className="px-4 py-3.5">Inmueble / Ubicación</th>
                <th className="px-4 py-3.5">Especialidad</th>
                <th className="px-4 py-3.5">Proveedor</th>
                <th className="px-4 py-3.5 text-right">Monto</th>
                <th className="px-4 py-3.5 text-center">Estado Alexperto</th>
                <th className="px-4 py-3.5 text-center">Gestión GEMA</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredQuotes.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedQuote(item)}
                  className="cursor-pointer transition hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                    <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[220px]">
                    <p className="truncate font-semibold text-slate-900 m-0">
                      {item.propertyName}
                    </p>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Registrado el {new Date(item.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800 m-0">
                      {item.specialty}
                    </p>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {item.subSpecialty}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-600">
                    {item.provider}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                    S/ {item.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                      {item.externalStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {getGemaBadge(item.gemaStatus)}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuote(item);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#072e27] hover:text-emerald-700 transition px-2.5 py-1 rounded-md hover:bg-emerald-50">
                      <span>Auditar</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER PAGINATION */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <span>Mostrando {filteredQuotes.length} cotizaciones</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Página 1 de 1</span>
          </div>
        </div>
      </section>

      {/* AUDIT SLIDE-OVER DRAWER */}
      <QuoteAuditDrawer
        open={Boolean(selectedQuote)}
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </main>
  );
}

export default function CotizacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm font-medium text-slate-500">
            Cargando cotizaciones de Alexperto...
          </p>
        </div>
      }>
      <CotizacionesContent />
    </Suspense>
  );
}
