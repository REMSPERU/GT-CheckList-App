'use client';

import { Suspense, useState } from 'react';

import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import {
  ClipboardList,
  FileQuestion,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ChevronRight,
  Users,
} from 'lucide-react';

const SPECIALTY_OPTIONS = [
  { value: '', label: 'Todas las especialidades' },
  { value: 'climatizacion', label: 'Climatización y HVAC' },
  { value: 'servicios_generales', label: 'Servicios generales' },
  { value: 'electricidad', label: 'Tableros e Instalaciones Eléctricas' },
  { value: 'sanitarias', label: 'Instalaciones Sanitarias' },
  { value: 'seguridad', label: 'Sistema Contra Incendio y Seguridad' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE_REVISION', label: 'Pendiente de Revisión' },
  { value: 'OBSERVADO', label: 'Observado' },
  { value: 'CULMINADO', label: 'Culminado' },
];

const MOCK_REQUESTS = [
  {
    id: 'req-001',
    code: 'SOL-9821',
    propertyName: 'PANORAMA CENTRO EMPRESARIAL DOS',
    specialty: 'Climatización y HVAC',
    description: 'Mantenimiento correctivo de chiler N° 2 por ruidos anómalos.',
    requesterName: 'Ing. Carlos Mendoza',
    externalStatus: 'PENDING',
    gemaStatus: 'PENDIENTE_REVISION',
    createdAt: '2026-08-12T16:20:10.000Z',
    hasQuote: true,
  },
  {
    id: 'req-002',
    code: 'SOL-9818',
    propertyName: 'EDIFICIO PARDO Y ALIAGA',
    specialty: 'Servicios generales',
    description: 'Reparación de filtración en muro cortina piso 12.',
    requesterName: 'Arq. Lucia Torres',
    externalStatus: 'IN_PROGRESS',
    gemaStatus: 'OBSERVADO',
    createdAt: '2026-08-12T15:10:45.000Z',
    hasQuote: false,
  },
  {
    id: 'req-003',
    code: 'SOL-9805',
    propertyName: 'TORRE TEKTON',
    specialty: 'Tableros e Instalaciones Eléctricas',
    description: 'Inspección de termografía en tablero general TG-01.',
    requesterName: 'Téc. Fernando Ruiz',
    externalStatus: 'RESOLVED',
    gemaStatus: 'CULMINADO',
    createdAt: '2026-08-11T18:40:00.000Z',
    hasQuote: true,
  },
];

function SolicitudesContent() {
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedGemaStatus, setSelectedGemaStatus] = useState('');

  const filteredRequests = MOCK_REQUESTS.filter(r => {
    if (
      search &&
      !r.code.toLowerCase().includes(search.toLowerCase()) &&
      !r.propertyName.toLowerCase().includes(search.toLowerCase()) &&
      !r.description.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (selectedGemaStatus && r.gemaStatus !== selectedGemaStatus) return false;
    return true;
  });

  const getGemaBadge = (status: string) => {
    switch (status) {
      case 'CULMINADO':
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

  return (
    <main className="grid gap-6 px-6 lg:px-8 py-6">
      {/* HEADER & SUMMARY KPIS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Solicitudes Registradas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ClipboardList size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 m-0 mt-1">12,450</p>
          <span className="text-[11px] text-slate-500 font-medium">
            Total en sistema Alexperto
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Sin Cotización Asignada
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <FileQuestion size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-900 m-0 mt-1">14</p>
          <span className="text-[11px] text-amber-700/80 font-medium">
            Requieren atención de proveedor
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              En Revisión GEMA
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-900 m-0 mt-1">
            {filteredRequests.length}
          </p>
          <span className="text-[11px] text-blue-700/80 font-medium">
            Asignadas a tus inmuebles
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Inmuebles Vinculados
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 m-0 mt-1">67 / 68</p>
          <span className="text-[11px] text-emerald-700 font-medium">
            Alcance de auditoría activo
          </span>
        </div>
      </section>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,1.5fr)_minmax(200px,1fr)_minmax(200px,1fr)] gap-3 items-center">
          <SearchInput
            placeholder="Buscar código (SOL-XXXX), inmueble o descripción..."
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
            options={STATUS_OPTIONS}
            onChange={setSelectedGemaStatus}
            ariaLabel="Filtrar por estado interno GEMA"
          />
        </div>
      </section>

      {/* DATA TABLE / LISTING */}
      <section className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3.5">Código</th>
                <th className="px-4 py-3.5">Inmueble</th>
                <th className="px-4 py-3.5">Especialidad y Descripción</th>
                <th className="px-4 py-3.5">Solicitante</th>
                <th className="px-4 py-3.5 text-center">Estado Alexperto</th>
                <th className="px-4 py-3.5 text-center">Gestión GEMA</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRequests.map(item => (
                <tr
                  key={item.id}
                  className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                    <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px]">
                    <p className="truncate font-semibold text-slate-900 m-0">
                      {item.propertyName}
                    </p>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {new Date(item.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[280px]">
                    <p className="font-semibold text-slate-900 m-0">
                      {item.specialty}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 m-0 mt-0.5">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} className="text-slate-400" />
                      {item.requesterName}
                    </span>
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
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#072e27] hover:text-emerald-700 transition px-2.5 py-1 rounded-md hover:bg-emerald-50">
                      <span>Ver Solicitud</span>
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
          <span>Mostrando {filteredRequests.length} solicitudes</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Página 1 de 1</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SolicitudesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm font-medium text-slate-500">
            Cargando solicitudes de Alexperto...
          </p>
        </div>
      }>
      <SolicitudesContent />
    </Suspense>
  );
}
