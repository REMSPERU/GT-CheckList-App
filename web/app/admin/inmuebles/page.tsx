'use client';

import { PropertiesGrid } from '@/components/admin/properties-grid';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { useAdminProperties } from '@/hooks/admin/use-admin-properties';

export default function AdminPropertiesPage() {
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
      />
    </main>
  );
}
