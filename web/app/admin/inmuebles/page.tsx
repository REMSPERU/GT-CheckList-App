'use client';

import { Suspense, useState } from 'react';

import { PropertiesGrid } from '@/components/admin/properties-grid';
import { PropertyDrawer } from '@/components/admin/property-drawer';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminProperties } from '@/hooks/admin/use-admin-properties';

import { Plus } from 'lucide-react';

function AdminPropertiesContent() {
  const properties = useAdminProperties();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <main className="grid gap-5 px-6 lg:px-8 py-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 max-w-2xl max-[640px]:flex-col max-[640px]:items-stretch">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar nombre, ciudad o dirección..."
              value={properties.search}
              onChange={properties.setSearch}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              properties.handleStatusChange(
                properties.status === 'inactive' ? 'active' : 'inactive',
              )
            }
            className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <span className={`h-2 w-2 rounded-full ${properties.status === 'inactive' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
            {properties.status === 'inactive' ? 'Ver Activos' : 'Ver Inactivos'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#072e27] px-5 text-sm font-bold text-white shadow-xs border border-emerald-950/20 transition hover:bg-[#05221d] max-[640px]:w-full">
          <Plus size={18} strokeWidth={2} />
          <span>Nuevo Inmueble</span>
        </button>
      </section>
      <Alert>{properties.errorMessage}</Alert>
      <PropertiesGrid
        items={properties.filteredItems}
        isLoading={properties.isLoading}
      />

      <PropertyDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSaveSuccess={prop => properties.addPropertyToList(prop)}
      />
    </main>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[400px] place-items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
          <p className="text-sm text-slate-500 font-medium">
            Cargando inmuebles...
          </p>
        </div>
      }>
      <AdminPropertiesContent />
    </Suspense>
  );
}
