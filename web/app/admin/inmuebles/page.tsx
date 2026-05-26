'use client';

import { Suspense } from 'react';

import { PropertiesGrid } from '@/components/admin/properties-grid';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminProperties } from '@/hooks/admin/use-admin-properties';

function AdminPropertiesContent() {
  const properties = useAdminProperties();

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <SearchInput
          placeholder="Buscar nombre, codigo, ciudad o direccion"
          value={properties.search}
          onChange={properties.setSearch}
        />
      </section>
      <Alert>{properties.errorMessage}</Alert>
      <PropertiesGrid
        items={properties.filteredItems}
        isLoading={properties.isLoading}
        onChangeImage={properties.changePropertyImage}
        uploadingImageId={properties.uploadingImageId}
      />
    </main>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={
      <div className="grid min-h-[400px] place-items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#bdd2d0] border-t-emerald-800" />
        <p className="text-sm text-slate-500 font-medium">Cargando inmuebles...</p>
      </div>
    }>
      <AdminPropertiesContent />
    </Suspense>
  );
}
