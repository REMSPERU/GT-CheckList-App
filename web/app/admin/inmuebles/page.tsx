'use client';

import { Suspense, useState } from 'react';

import { PropertiesGrid } from '@/components/admin/properties-grid';
import { PropertyDrawer } from '@/components/admin/property-drawer';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminProperties } from '@/hooks/admin/use-admin-properties';

function AdminPropertiesContent() {
  const properties = useAdminProperties();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <section className="flex items-center justify-between gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <div className="flex-1 max-w-lg">
          <SearchInput
            placeholder="Buscar nombre, ciudad o direccion"
            value={properties.search}
            onChange={properties.setSearch}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-950 transition shadow-sm max-[640px]:w-full text-center shrink-0">
          ➕ Nuevo Inmueble
        </button>
      </section>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            properties.handleStatusChange(
              properties.status === 'inactive' ? 'active' : 'inactive',
            )
          }
          className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800">
          {properties.status === 'inactive'
            ? 'Ver inmuebles activos'
            : 'Ver dados de baja'}
        </button>
      </div>
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
