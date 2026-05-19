'use client';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { PropertiesTable } from '@/components/admin/properties-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminProperties } from '@/hooks/admin/use-admin-properties';

export default function AdminPropertiesPage() {
  const properties = useAdminProperties();

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <AdminPageHeader
        eyebrow="Sedes"
        title="Inmuebles"
        description="Vista de inmuebles registrados y su prioridad de mantenimiento."
      />
      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <SearchInput
          placeholder="Buscar nombre, codigo, ciudad o direccion"
          value={properties.search}
          onChange={properties.setSearch}
        />
      </section>
      <Alert>{properties.errorMessage}</Alert>
      <PropertiesTable
        items={properties.filteredItems}
        isLoading={properties.isLoading}
      />
    </main>
  );
}
