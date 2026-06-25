'use client';

import React from 'react';
import {
  Zap,
  Cpu,
  CheckCircle2,
  XCircle,
  GitBranch,
  Activity,
  Layers,
  ShieldAlert,
  Info
} from 'lucide-react';

// Interfaces mapping the database JSON shape of electrical panels
export interface Differential {
  fases: string;
  existe: boolean;
  amperaje: number | string;
  tipo_cable?: string;
  diametro_cable?: string;
}

export interface ITM {
  id: string;
  nombre?: string;
  tipo?: 'ITM' | 'ID';
  fases: string;
  amperaje: number | string;
  suministra: string;
  tipo_cable: string;
  diametro_cable: string;
  diferencial?: Differential;
  sub_itms?: {
    id: string;
    nombre?: string;
    fases: string;
    amperaje: number | string;
    suministra: string;
    tipo_cable: string;
    diametro_cable: string;
    diferencial?: Differential;
  }[];
}

export interface ITG {
  id: string;
  prefijo?: string;
  suministra?: string;
  fases?: string;
  amperaje?: number | string;
  diametro_cable?: string;
  tipo_cable?: string;
  itms: ITM[];
}

export interface ComponentItem {
  codigo: string;
  suministra: string;
}

export interface Componente {
  tipo: string;
  items: ComponentItem[];
}

export interface TechnicalDetail {
  fases: string;
  voltaje: number | string;
  tipo_tablero: string;
}

export interface ElectricalPanelData {
  rotulo?: string;
  tipo_tablero?: string;
  detalle_tecnico?: TechnicalDetail;
  itgs?: ITG[];
  componentes?: Componente[];
  condiciones_especiales?: Record<string, boolean>;
}

interface ElectricalPanelDetailProps {
  data: unknown;
}

const formatConditionKey = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
};

const hasRenderableValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

export function ElectricalPanelDetail({ data }: ElectricalPanelDetailProps) {
  // If the data is empty or invalid, render a fallback alert
  if (!data || typeof data !== 'object') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 border border-amber-200">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>No hay datos de tablero eléctrico configurados o el formato es incorrecto.</span>
      </div>
    );
  }

  const panel = data as ElectricalPanelData;
  const rotulo = panel.rotulo || 'Sin Rótulo';
  const detail = panel.detalle_tecnico || { fases: '-', voltaje: '-', tipo_tablero: '-' };
  const itgs = panel.itgs || [];
  const componentes = panel.componentes || [];
  const condicionesEspeciales = panel.condiciones_especiales || {};

  return (
    <div className="space-y-6">
      {/* Header Info Area */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Panel Detallado
            </span>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">
              Rótulo: <span className="text-emerald-700">{rotulo}</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Two-Column Responsive Layout for Desktops */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: General Thermomagnetic Switches and Circuits (2/3 width on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            Interruptores Generales y Circuitos ({itgs.length})
          </h4>

          {itgs.length > 0 ? (
            <div className="space-y-4">
              {itgs.map((itg, idx) => (
                <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                  {/* ITG Header */}
                  <div className="border-b border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                          IG
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">{itg.id}</span>
                            {itg.fases && (
                              <span className="rounded bg-emerald-100/75 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800">
                                {itg.fases}
                              </span>
                            )}
                          </div>
                          {itg.suministra && (
                            <p className="m-0 text-xs font-medium text-slate-500 mt-0.5">
                              Suministra: {itg.suministra}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ITG Specs */}
                      {(hasRenderableValue(itg.amperaje) ||
                        hasRenderableValue(itg.diametro_cable) ||
                        hasRenderableValue(itg.tipo_cable)) && (
                        <div className="flex flex-wrap gap-2">
                          {hasRenderableValue(itg.amperaje) && (
                            <div className="rounded-lg bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-center">
                              <span className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">Amp</span>
                              <span className="text-xs font-bold text-slate-700">{itg.amperaje}A</span>
                            </div>
                          )}
                          {hasRenderableValue(itg.diametro_cable) && (
                            <div className="rounded-lg bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-center">
                              <span className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">Cálculo</span>
                              <span className="text-xs font-bold text-slate-700">{itg.diametro_cable} mm²</span>
                            </div>
                          )}
                          {hasRenderableValue(itg.tipo_cable) && (
                            <div className="rounded-lg bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-center">
                              <span className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">Cable</span>
                              <span className="text-xs font-bold text-slate-700">{itg.tipo_cable}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ITMs List */}
                  <div className="p-4 bg-white space-y-3">
                    {itg.itms && itg.itms.length > 0 ? (
                      <div className="grid gap-3">
                        {itg.itms.map((itm, cIdx) => {
                          const circuitName = itm.nombre && itm.nombre.trim() !== '' ? itm.nombre : itm.id;
                          const isDifferentialType = itm.tipo === 'ID';
                          
                          // Determine if this circuit card has differential or sub-breakers on the right side
                          const hasRightContent = !!(
                            itm.diferencial?.existe || 
                            (itm.sub_itms && itm.sub_itms.length > 0)
                          );

                          return (
                            <div
                              key={cIdx}
                              className="rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/75 p-4 transition-colors duration-250"
                            >
                              <div className={hasRightContent ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "block"}>
                                {/* Left Side: Main Circuit Info */}
                                <div className="space-y-2">
                                  <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black border ${
                                      isDifferentialType 
                                        ? 'bg-cyan-50 border-cyan-100 text-cyan-700' 
                                        : 'bg-slate-100 border-slate-200 text-slate-700'
                                    }`}>
                                      {itm.id}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-slate-800 text-sm truncate">
                                          {circuitName}
                                        </span>
                                        <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black tracking-wide ${
                                          isDifferentialType 
                                            ? 'bg-cyan-100 text-cyan-800' 
                                            : 'bg-slate-200/80 text-slate-700'
                                        }`}>
                                          {itm.tipo || 'ITM'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5">
                                          {itm.amperaje}A
                                        </span>
                                        <span className="rounded bg-sky-50 px-1.5 py-0.2 text-[9px] font-semibold text-sky-700 border border-sky-100 font-sans">
                                          {itm.fases}
                                        </span>
                                      </div>

                                      {itm.tipo !== 'ID' && hasRenderableValue(itm.suministra) && (
                                        <p className="m-0 text-xs font-semibold text-slate-600 mt-1.5">
                                          Suministra: <span className="font-medium text-slate-500">{itm.suministra}</span>
                                        </p>
                                      )}

                                      <p className="m-0 text-[10px] font-medium text-slate-400 mt-1">
                                        Cable: {itm.tipo_cable || '-'} • {itm.diametro_cable || '-'} mm²
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Differential Protector & Sub-ITMs */}
                                {hasRightContent && (
                                  <div className="space-y-3 border-t border-slate-200/60 pt-3 md:border-t-0 md:pt-0 md:border-l md:border-dashed md:border-slate-200 md:pl-4">
                                    {/* Differential protector */}
                                    {itm.diferencial?.existe && (
                                      <div className="rounded-lg border-l-4 border-cyan-500 bg-cyan-50/40 p-2.5 text-xs text-cyan-900">
                                        <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider text-cyan-700 mb-1">
                                          <Activity className="h-3.5 w-3.5" />
                                          Interruptor Diferencial
                                        </div>
                                        <div className="font-semibold text-slate-750">
                                          {itm.diferencial.amperaje}A - {itm.diferencial.fases}
                                        </div>
                                        {hasRenderableValue(itm.diferencial.tipo_cable) && (
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            Cable: {itm.diferencial.tipo_cable} • {itm.diferencial.diametro_cable} mm²
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Sub-breakers tree */}
                                    {(itm.tipo === 'ID' || itm.tipo === 'ITM') && itm.sub_itms && itm.sub_itms.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                          <GitBranch className="h-3.5 w-3.5 text-slate-400 rotate-180" />
                                          Interruptores Asociados ({itm.sub_itms.length})
                                        </div>
                                        
                                        {itm.sub_itms.map((subItm, sIdx) => (
                                          <div key={sIdx} className="rounded-lg border border-slate-100 bg-white p-2.5 space-y-2 shadow-sm">
                                            <div className="flex items-start gap-2.5">
                                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-50 text-[10px] font-black border border-slate-200 text-slate-600">
                                                {subItm.id}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  <span className="font-semibold text-slate-800 text-xs truncate">
                                                    {subItm.nombre || subItm.id}
                                                  </span>
                                                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 rounded px-1.5">
                                                    {subItm.amperaje}A
                                                  </span>
                                                  <span className="rounded bg-sky-50 px-1 py-0.2 text-[8px] font-semibold text-sky-700">
                                                    {subItm.fases}
                                                  </span>
                                                </div>
                                                {hasRenderableValue(subItm.suministra) && (
                                                  <p className="m-0 text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                                                    Suministra: {subItm.suministra}
                                                  </p>
                                                )}
                                                <p className="m-0 text-[9px] text-slate-400">
                                                  Cable: {subItm.tipo_cable || '-'} • {subItm.diametro_cable || '-'} mm²
                                                </p>
                                              </div>
                                            </div>

                                            {/* Sub-ITM Differential */}
                                            {subItm.diferencial?.existe && (
                                              <div className="ml-9 rounded bg-cyan-50/20 border-l-2 border-cyan-400 p-2 text-[11px] text-cyan-900">
                                                <div className="flex items-center gap-1 font-bold text-[8px] uppercase tracking-wider text-cyan-700 mb-0.5">
                                                  Diferencial
                                                </div>
                                                <span className="font-semibold text-slate-600">
                                                  {subItm.diferencial.amperaje}A - {subItm.diferencial.fases}
                                                </span>
                                                {hasRenderableValue(subItm.diferencial.tipo_cable) && (
                                                  <div className="text-[9px] text-slate-400">
                                                    {subItm.diferencial.tipo_cable} • {subItm.diferencial.diametro_cable} mm²
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="m-0 text-xs font-semibold text-slate-400 text-center py-2">
                        Sin circuitos configurados bajo este interruptor.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <Info className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500 font-semibold">No hay interruptores generales configurados.</p>
            </div>
          )}
        </div>

        {/* Right Column: Tech Specs, Conditions & Components (1/3 width on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Ficha Técnica Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Ficha Técnica
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100/60 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Montaje</span>
                <span className="font-black text-slate-800">{detail.tipo_tablero || '-'}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100/60 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Voltaje</span>
                <span className="font-black text-slate-800">{detail.voltaje ? `${detail.voltaje} V` : '-'}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100/60 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Fases</span>
                <span className="font-black text-slate-800">{detail.fases || '-'}</span>
              </div>
            </div>
          </div>

          {/* Condiciones Especiales Card */}
          {Object.keys(condicionesEspeciales).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Condiciones Especiales
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(condicionesEspeciales).map(([key, value]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                      value
                        ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                        : 'bg-slate-50 border-slate-100 text-slate-400 line-through decoration-slate-200'
                    }`}
                  >
                    {value ? (
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4.5 w-4.5 shrink-0 text-slate-300" />
                    )}
                    <span className="truncate">{formatConditionKey(key)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Componentes Adicionales Card */}
          {componentes.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Componentes Adicionales
              </h4>
              <div className="space-y-3.5">
                {componentes.map((comp, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="block text-[9px] font-black uppercase text-emerald-700 tracking-wider">
                      {comp.tipo}
                    </span>
                    <div className="space-y-1">
                      {comp.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs border border-slate-100">
                          <span className="font-bold text-slate-700 font-mono">
                            {item.codigo}
                          </span>
                          <span className="text-slate-500 font-medium truncate max-w-[140px]">
                            {item.suministra}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
