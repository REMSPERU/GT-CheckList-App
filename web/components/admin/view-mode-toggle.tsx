'use client';

import React from 'react';
import { LayoutGrid, Table } from 'lucide-react';

export type ViewMode = 'grid' | 'table';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-inner">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
          viewMode === 'grid'
            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-800'
        }`}>
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Tarjetas</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
          viewMode === 'table'
            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-800'
        }`}>
        <Table className="h-3.5 w-3.5" />
        <span>Tabla</span>
      </button>
    </div>
  );
}
