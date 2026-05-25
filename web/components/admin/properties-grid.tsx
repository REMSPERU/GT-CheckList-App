import Image from 'next/image';

import type { AdminPropertyRow } from '@/types/admin';

interface PropertiesGridProps {
  items: AdminPropertyRow[];
  isLoading: boolean;
}

export function PropertiesGrid({ items, isLoading }: PropertiesGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 max-[640px]:grid-cols-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[22px] border border-slate-200 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.06)]"
          >
            <div className="aspect-[16/10] rounded-t-[22px] bg-slate-200" />
            <div className="grid gap-3 p-5">
              <div className="h-5 w-3/4 rounded-lg bg-slate-200" />
              <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
              <div className="h-4 w-full rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-[22px] border border-dashed border-slate-300 bg-white/60 px-5 py-10 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            🏢
          </div>
          <strong className="block text-lg text-slate-900">
            Sin inmuebles
          </strong>
          <p className="mb-0 mt-2 text-sm text-slate-500">
            No se encontraron inmuebles con los filtros actuales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="m-0 text-sm font-bold text-slate-500">
        {items.length} inmueble{items.length === 1 ? '' : 's'}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 max-[640px]:grid-cols-1">
        {items.map(item => (
          <PropertyCard key={item.id} property={item} />
        ))}
      </div>
    </>
  );
}

const NEXT_IMAGE_ALLOWED_HOSTS = [
  'encrypted-tbn0.gstatic.com',
  'images.unsplash.com',
  'placehold.co',
  'static.wixstatic.com',
];

function isNextImageSafe(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host.endsWith('.supabase.co') || NEXT_IMAGE_ALLOWED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

function PropertyCard({ property }: { property: AdminPropertyRow }) {
  const priorityConfig = getPriorityConfig(property.maintenance_priority);
  const useNextImage = property.image_url ? isNextImageSafe(property.image_url) : false;

  return (
    <article className="group relative grid overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)]">
      {/* Image section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {property.image_url ? (
          useNextImage ? (
            <Image
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              src={property.image_url}
              alt={property.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <img
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              src={property.image_url}
              alt={property.name}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50">
            <span className="text-5xl opacity-40">🏢</span>
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute left-3 top-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] backdrop-blur-md ${
              property.is_active
                ? 'bg-emerald-500/90 text-white'
                : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                property.is_active ? 'bg-emerald-200' : 'bg-slate-500'
              }`}
            />
            {property.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Priority badge overlay */}
        {property.maintenance_priority ? (
          <div className="absolute right-3 top-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] backdrop-blur-md ${priorityConfig.className}`}
            >
              {priorityConfig.label}
            </span>
          </div>
        ) : null}
      </div>

      {/* Content section */}
      <div className="grid gap-3 p-5">
        <div>
          <h3 className="m-0 text-[1.05rem] font-black leading-tight tracking-[-0.02em] text-slate-950">
            {property.name}
          </h3>
          {property.code ? (
            <p className="m-0 mt-1 text-xs font-bold text-slate-400">
              {property.code}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          {property.city ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="text-xs">📍</span>
              <span className="font-semibold">{property.city}</span>
            </div>
          ) : null}
          {property.address ? (
            <p className="m-0 line-clamp-2 text-[0.82rem] leading-relaxed text-slate-500">
              {property.address}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function getPriorityConfig(priority: string | null) {
  switch (priority?.toUpperCase()) {
    case 'ALTA':
      return {
        label: 'Alta',
        className: 'bg-red-500/90 text-white',
      };
    case 'MEDIA':
      return {
        label: 'Media',
        className: 'bg-amber-400/90 text-amber-950',
      };
    case 'BAJA':
      return {
        label: 'Baja',
        className: 'bg-sky-400/90 text-sky-950',
      };
    default:
      return {
        label: priority ?? '-',
        className: 'bg-slate-600/80 text-white',
      };
  }
}
