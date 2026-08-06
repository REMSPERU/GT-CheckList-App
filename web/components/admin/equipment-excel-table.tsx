'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/admin/status-badge';
import { formatUbicacion } from '@/lib/ubicacion';

export interface DynamicColumn {
  key: string;
  label: string;
}

export interface EquipmentTableRowData {
  id: string;
  codigo: string | null;
  ubicacion: string | null;
  detalle_ubicacion: string | null;
  estatus: string | null;
  equipment_detail?: any;
}

interface EquipmentExcelTableProps {
  equipos: EquipmentTableRowData[];
  propertyId: string;
  equipmentTypeId: string;
  dynamicColumns: DynamicColumn[];
}

export function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
        Sí
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
        No
      </span>
    );
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `${value.length} ítems`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function EquipmentExcelTable({
  equipos,
  propertyId,
  equipmentTypeId,
  dynamicColumns,
}: EquipmentExcelTableProps) {
  return (
    <div className="grid gap-3 animate-in fade-in duration-200">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-white text-[11px] font-black uppercase tracking-wider">
              <th className="px-3.5 py-3 border-b border-slate-800 text-center w-12 shrink-0">
                #
              </th>
              <th className="sticky left-0 z-20 bg-slate-950 px-4 py-3 border-b border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                Código
              </th>
              <th className="px-4 py-3 border-b border-slate-800">
                Ubicación
              </th>
              <th className="px-4 py-3 border-b border-slate-800">
                Detalle Ubicación
              </th>
              <th className="px-4 py-3 border-b border-slate-800">
                Estado
              </th>
              {dynamicColumns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 border-b border-slate-800 whitespace-nowrap text-emerald-400">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 border-b border-slate-800 text-right pr-6">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {equipos.map((equipo, idx) => {
              const detail = equipo.equipment_detail || {};
              return (
                <tr
                  key={equipo.id}
                  className="group transition-colors hover:bg-emerald-50/40 even:bg-slate-50/40">
                  <td className="px-3.5 py-3 text-center text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-emerald-50/90 group-even:bg-slate-50/90 px-4 py-3 font-mono font-bold text-slate-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                    {equipo.codigo || 'Sin código'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                    {formatUbicacion(equipo.ubicacion)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-medium max-w-[220px] truncate">
                    {equipo.detalle_ubicacion || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge>{equipo.estatus}</StatusBadge>
                  </td>
                  {dynamicColumns.map(col => {
                    const cellVal = detail[col.key];
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                        {formatCellValue(cellVal)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right pr-6 whitespace-nowrap">
                    <Link
                      href={`/admin/inmuebles/${propertyId}/especialidad/${equipmentTypeId}?equipmentId=${equipo.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white transition shadow-sm no-underline">
                      <span>Ver</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer de resumen */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold text-slate-500 bg-slate-50/80 rounded-xl border border-slate-200/80">
        <span>
          Mostrando {equipos.length} activos en formato tabla
        </span>
        <span>
          {dynamicColumns.length} columnas técnicas detectadas desde JSON
        </span>
      </div>
    </div>
  );
}
