import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { AdminPropertyRow } from '@/types/admin';

interface PropertiesGridProps {
  items: AdminPropertyRow[];
  isLoading: boolean;
  onChangeImage?: (propertyId: string, file: File) => void;
  uploadingImageId?: string | null;
}

export function PropertiesGrid({ items, isLoading, onChangeImage, uploadingImageId }: PropertiesGridProps) {
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
          <PropertyCard 
            key={item.id} 
            property={item} 
            onChangeImage={onChangeImage}
            isUploading={uploadingImageId === item.id}
          />
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

function PropertyCard({ 
  property, 
  onChangeImage, 
  isUploading 
}: { 
  property: AdminPropertyRow;
  onChangeImage?: (propertyId: string, file: File) => void;
  isUploading?: boolean;
}) {
  const useNextImage = property.image_url ? isNextImageSafe(property.image_url) : false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChangeImage) {
      onChangeImage(property.id, file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <article className="group relative grid overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)]">
      {/* Image section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <Link href={`/admin/inmuebles/${property.id}`} className="absolute inset-0 block">
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
        </Link>

        {/* Upload Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-emerald-400" />
              <span className="text-sm font-semibold text-white shadow-sm">Subiendo...</span>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-105 shadow-lg"
            >
              📷 Cambiar Foto
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Content section */}
      <div className="grid gap-3 p-5">
        <div>
          <Link href={`/admin/inmuebles/${property.id}`} className="no-underline group/title">
            <h3 className="m-0 text-[1.05rem] font-black leading-tight tracking-[-0.02em] text-slate-950 hover:text-emerald-800 transition-colors">
              {property.name}
            </h3>
          </Link>
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
