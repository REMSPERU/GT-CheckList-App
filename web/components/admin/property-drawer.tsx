import { useEffect, useRef, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { createAdminProperty, updateAdminProperty } from '@/services/admin/properties.service';
import type { AdminPropertyRow } from '@/types/admin';
import { uploadPropertyPhoto } from '@/utils/upload-image';
import { X, Camera, Trash2, AlertTriangle } from 'lucide-react';

interface PropertyDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: (property: AdminPropertyRow, isNew: boolean) => void;
  propertyToEdit?: AdminPropertyRow | null;
}

export function PropertyDrawer({
  open,
  onClose,
  onSaveSuccess,
  propertyToEdit = null,
}: PropertyDrawerProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [floor, setFloor] = useState('');
  const [basement, setBasement] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Focus trap & keyboard listener
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const firstInput = drawerRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), button, select, textarea'
    );
    firstInput?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Synchronize fields when propertyToEdit changes or drawer opens
  useEffect(() => {
    if (open) {
      if (propertyToEdit) {
        setName(propertyToEdit.name || '');
        setCode(propertyToEdit.code || '');
        setCity(propertyToEdit.city || '');
        setAddress(propertyToEdit.address || '');
        setFloor(propertyToEdit.floor !== null && propertyToEdit.floor !== undefined ? String(propertyToEdit.floor) : '');
        setBasement(propertyToEdit.basement !== null && propertyToEdit.basement !== undefined ? String(propertyToEdit.basement) : '');
        setImageUrl(propertyToEdit.image_url || '');
        setImagePreview(propertyToEdit.image_url || null);
        setIsActive(propertyToEdit.is_active !== undefined ? propertyToEdit.is_active : true);
      } else {
        // Clear fields for new property
        setName('');
        setCode('');
        setCity('');
        setAddress('');
        setFloor('');
        setBasement('');
        setImageUrl('');
        setImagePreview(null);
        setIsActive(true);
      }
      setSelectedFile(null);
      setErrorMessage(null);
    }
  }, [open, propertyToEdit]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('El nombre del inmueble es requerido');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const supabase = getSupabaseClient();
      let finalImageUrl = imageUrl;

      // Upload file to Supabase if a new file is chosen
      if (selectedFile) {
        try {
          finalImageUrl = await uploadPropertyPhoto(supabase, selectedFile, name.trim());
        } catch (uploadError) {
          throw new Error(
            uploadError instanceof Error 
              ? `Error al subir imagen: ${uploadError.message}` 
              : 'Error al subir la imagen'
          );
        }
      }

      const propertyData = {
        name: name.trim(),
        code: code.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        image_url: finalImageUrl || null,
        floor: floor.trim() ? parseInt(floor.trim(), 10) : null,
        basement: basement.trim() ? parseInt(basement.trim(), 10) : null,
        is_active: isActive,
      };

      let result: AdminPropertyRow;
      if (propertyToEdit) {
        result = await updateAdminProperty(supabase, propertyToEdit.id, propertyData);
      } else {
        result = await createAdminProperty(supabase, propertyData);
      }

      onSaveSuccess(result, !propertyToEdit);
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al guardar el inmueble');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#061711]/65 backdrop-blur-[4px] animate-backdrop-in"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <section 
        ref={drawerRef}
        className="relative z-10 flex h-full w-full max-w-[500px] flex-col border-l border-slate-200 bg-[#f8faf6] shadow-2xl animate-drawer-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-drawer-title"
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#05221d] bg-[#072e27] px-6 py-5 text-white">
          <div className="relative flex items-center justify-between">
            <div>
              <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-emerald-400">
                {propertyToEdit ? 'Administración' : 'Nuevo Registro'}
              </p>
              <h2 id="property-drawer-title" className="m-0 text-xl font-bold tracking-[-0.04em]">
                {propertyToEdit ? 'Editar Inmueble' : 'Agregar Inmueble'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-lg border border-emerald-900/60 bg-[#05221d] text-slate-300 transition hover:bg-[#0a3d34] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Cerrar panel de inmueble"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-5">
              {/* Cover Image Upload Area */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Foto de Portada
                </label>
                {imagePreview ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img 
                      src={imagePreview} 
                      alt={name ? `Foto de portada de ${name}` : 'Vista previa de la foto de portada del inmueble'} 
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg bg-rose-600 font-bold text-white shadow hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      aria-label="Eliminar foto de portada"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-4 text-center transition hover:border-emerald-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label="Seleccionar o arrastrar foto de portada del inmueble"
                  >
                    <Camera className="h-7 w-7 text-slate-400 mb-1.5" />
                    <strong className="text-xs text-slate-700">Arrastra una imagen o haz clic</strong>
                    <span className="mt-1 text-[0.65rem] text-slate-400 font-medium">Recomendado formato WebP, JPG o PNG</span>
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

              {/* Inmueble Name */}
              <div>
                <label htmlFor="property-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nombre del Inmueble *
                </label>
                <input
                  id="property-name"
                  type="text"
                  placeholder="Ej. Edificio Premium San Isidro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  required
                />
              </div>

              {/* Code and City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="property-code" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Código (Opcional)
                  </label>
                  <input
                    id="property-code"
                    type="text"
                    placeholder="Ej. EP-SI"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="property-city" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ciudad
                  </label>
                  <input
                    id="property-city"
                    type="text"
                    placeholder="Ej. Lima"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="property-address" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dirección
                </label>
                <input
                  id="property-address"
                  type="text"
                  placeholder="Ej. Av. Javier Prado Este 1230"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Floors and Basements */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="property-floor" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Número de Pisos
                  </label>
                  <input
                    id="property-floor"
                    type="number"
                    min="0"
                    placeholder="Ej. 10"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label htmlFor="property-basement" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Número de Sótanos
                  </label>
                  <input
                    id="property-basement"
                    type="number"
                    min="0"
                    placeholder="Ej. 3"
                    value={basement}
                    onChange={(e) => setBasement(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Status Toggle Switch */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Estado del Inmueble
                  </label>
                  <p className="m-0 mt-0.5 text-[11px] text-slate-500 font-medium">
                    {isActive ? 'El inmueble está activo y visible en la app.' : 'El inmueble está dado de baja (inactivo).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={isActive}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-200 bg-white px-6 py-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#072e27] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#05221d] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Guardando...
                </>
              ) : (
                'Guardar Inmueble'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
