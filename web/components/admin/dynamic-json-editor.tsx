'use client';

import React from 'react';

function formatLabel(key: string): string {
  const lowerKey = key.toLowerCase();
  const dictionary: Record<string, string> = {
    tiene_vdf: '¿Tiene variador de frecuencia (VDF)?',
    vdf: 'Variador de frecuencia (VDF)',
    marca: 'Marca',
    modelo: 'Modelo',
    serie: 'Número de Serie',
    capacidad: 'Capacidad',
    potencia: 'Potencia',
    voltaje: 'Voltaje',
    corriente: 'Corriente (Amperaje)',
    fases: 'Fases',
    presion: 'Presión',
    temperatura: 'Temperatura',
    rpm: 'RPM (Velocidad)',
    frecuencia: 'Frecuencia',
    refrigerante: 'Tipo de Refrigerante',
    aceite: 'Tipo de Aceite',
    filtro: 'Filtro',
    ubicacion_exacta: 'Ubicación Exacta',
  };

  return dictionary[lowerKey] ?? key.replace(/_/g, ' ');
}

interface DynamicJsonEditorProps {
  data: unknown;
  onChange: (newData: unknown) => void;
  readOnly?: boolean;
}

export function DynamicJsonEditor({ data, onChange, readOnly = false }: DynamicJsonEditorProps) {
  if (data === null || data === undefined) {
    return <p className="text-sm text-slate-500 italic">Sin datos técnicos para editar.</p>;
  }

  return (
    <div className="space-y-4">
      <RecursiveEditor value={data} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}

interface RecursiveEditorProps {
  value: unknown;
  onChange: (newValue: unknown) => void;
  label?: string;
  readOnly?: boolean;
}

function RecursiveEditor({ value, onChange, label, readOnly }: RecursiveEditorProps) {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle primitives
  if (typeof value === 'string' || typeof value === 'number') {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {formatLabel(label)}
          </label>
        )}
        <input
          type={typeof value === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(typeof value === 'number' ? (val === '' ? 0 : Number(val)) : val);
          }}
          disabled={readOnly}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50"
        />
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        {label && (
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {formatLabel(label)}
          </label>
        )}
      </div>
    );
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
        {label && (
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            {formatLabel(label)}
          </h4>
        )}
        <div className="space-y-4">
          {value.map((item, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <span className="mb-2 block text-[10px] font-bold text-emerald-600 uppercase">
                Ítem {index + 1}
              </span>
              <RecursiveEditor
                value={item}
                onChange={(newItem) => {
                  const newArray = [...value];
                  newArray[index] = newItem;
                  onChange(newArray);
                }}
                readOnly={readOnly}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle Objects
  if (typeof value === 'object') {
    return (
      <div className={`grid grid-cols-1 gap-4 ${label ? 'rounded-xl border border-slate-200/60 bg-slate-50/50 p-4' : ''}`}>
        {label && (
          <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-2">
            {formatLabel(label)}
          </h4>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(value).map(([k, v]) => {
            // Ignore technical IDs
            const normalizedK = k.toLowerCase().trim();
            if (k === 'id' || k.endsWith('_id') || k.startsWith('id_') || normalizedK === 'id') {
              return null;
            }
            return (
              <div key={k} className={typeof v === 'object' ? 'col-span-1 md:col-span-2' : ''}>
                <RecursiveEditor
                  label={k}
                  value={v}
                  onChange={(newV) => {
                    const newObj = { ...value, [k]: newV };
                    onChange(newObj);
                  }}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
