import { useEffect, useState, type ChangeEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { useDebouncedValue } from './use-debounced-value';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import {
  getDistinctEquipmentDetailSubtypes,
  getDistinctEquipmentDetailTypes,
  listAdminEquipmentsForQr,
} from '@/services/admin/equipments.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type { AdminEquipmentQrRow, AdminEquipmentTypeRow, AdminPropertyRow } from '@/types/admin';
import type { QrConfigState, QrLogoRadius, QrLogoSize, QrPrintSize } from '@/components/admin/qr/qr-types';

const STORAGE_KEYS = {
  logo: 'admin-equipment-qr-logo',
  logoSize: 'admin-equipment-qr-logo-size',
  logoRadius: 'admin-equipment-qr-logo-radius',
  printSize: 'admin-equipment-qr-print-size',
} as const;

const LOGO_PRINT_SIZE: Record<QrLogoSize, number> = { normal: 40, large: 48 };
const LOGO_RADIUS: Record<QrLogoRadius, number> = { square: 6, soft: 14 };

export function useAdminQr() {
  const [items, setItems] = useState<AdminEquipmentQrRow[]>([]);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [systems, setSystems] = useState<{ id: string; nombre: string }[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVO');
  const [propertyId, setPropertyId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [tipo, setTipo] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [subtipos, setSubtipos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<QrConfigState>({ showLogo: true, logoDataUrl: null, logoSize: 'large', logoRadius: 'square', printSize: 'normal' });
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    const storedPrintSize = localStorage.getItem(STORAGE_KEYS.printSize);
    setConfig(current => ({
      ...current,
      logoDataUrl: localStorage.getItem(STORAGE_KEYS.logo),
      logoSize: localStorage.getItem(STORAGE_KEYS.logoSize) === 'normal' ? 'normal' : 'large',
      logoRadius: localStorage.getItem(STORAGE_KEYS.logoRadius) === 'soft' ? 'soft' : 'square',
      printSize: storedPrintSize === 'extraCompact' ? 'extra-compact' : (storedPrintSize as QrPrintSize) || 'normal',
    }));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        const supabase = getSupabaseClient();
        const [propertyRows, typeRows, systemResult] = await Promise.all([
          listAdminProperties(supabase),
          listAdminEquipmentTypes(supabase),
          supabase.from('sistemas').select('id, nombre').order('nombre', { ascending: true }),
        ]);
        if (!active) return;
        setProperties(propertyRows);
        setEquipmentTypes(typeRows);
        setSystems((systemResult.data ?? []) as { id: string; nombre: string }[]);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los filtros');
      }
    }
    void loadOptions();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadTypes() {
      try {
        const values = await getDistinctEquipmentDetailTypes(getSupabaseClient(), { propertyId, systemId, equipmentTypeId });
        if (active) setTipos(values);
      } catch (error) { if (active) console.error('Error loading QR type filters:', error); }
    }
    void loadTypes();
    return () => { active = false; };
  }, [equipmentTypeId, propertyId, systemId]);

  useEffect(() => {
    let active = true;
    if (!tipo) { setSubtipos([]); return () => { active = false; }; }
    async function loadSubtypes() {
      try {
        const values = await getDistinctEquipmentDetailSubtypes(getSupabaseClient(), { propertyId, systemId, equipmentTypeId, tipo });
        if (active) setSubtipos(values);
      } catch (error) { if (active) console.error('Error loading QR subtype filters:', error); }
    }
    void loadSubtypes();
    return () => { active = false; };
  }, [equipmentTypeId, propertyId, systemId, tipo]);

  useEffect(() => {
    let active = true;
    async function loadItems() {
      if (!propertyId) { setItems([]); setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const rows = await listAdminEquipmentsForQr(getSupabaseClient(), { search: debouncedSearch, status, propertyId, systemId, equipmentTypeId, tipo, subtipo });
        if (active) { setItems(rows); setErrorMessage(null); }
      } catch (error) { if (active) setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los QRs'); }
      finally { if (active) setIsLoading(false); }
    }
    void loadItems();
    return () => { active = false; };
  }, [debouncedSearch, equipmentTypeId, propertyId, status, subtipo, systemId, tipo]);

  function changeScope(nextSystemId: string, nextEquipmentTypeId: string) {
    setSystemId(nextSystemId); setEquipmentTypeId(nextEquipmentTypeId); setTipo(''); setSubtipo('');
  }
  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErrorMessage('Selecciona una imagen válida para el logo.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') { setConfig(current => ({ ...current, logoDataUrl: reader.result as string, showLogo: true })); localStorage.setItem(STORAGE_KEYS.logo, reader.result as string); } };
    reader.onerror = () => setErrorMessage('No se pudo leer la imagen del logo.');
    reader.readAsDataURL(file); event.target.value = '';
  }
  function updateConfig<K extends keyof QrConfigState>(key: K, value: QrConfigState[K], storageKey?: string) {
    setConfig(current => ({ ...current, [key]: value }));
    if (storageKey) localStorage.setItem(storageKey, String(value));
  }

  return {
    items, properties, systems, equipmentTypes, search, status, propertyId, systemId, equipmentTypeId, tipo, subtipo, tipos, subtipos, isLoading, errorMessage, config,
    setSearch, setStatus, setPropertyId, setTipo: (value: string) => { setTipo(value); setSubtipo(''); }, setSubtipo,
    changeScope, handleLogoChange, setErrorMessage,
    removeLogo: () => { setConfig(current => ({ ...current, logoDataUrl: null })); localStorage.removeItem(STORAGE_KEYS.logo); },
    setShowLogo: (value: boolean) => updateConfig('showLogo', value),
    setLogoSize: (value: QrLogoSize) => updateConfig('logoSize', value, STORAGE_KEYS.logoSize),
    setLogoRadius: (value: QrLogoRadius) => updateConfig('logoRadius', value, STORAGE_KEYS.logoRadius),
    setPrintSize: (value: QrPrintSize) => updateConfig('printSize', value, STORAGE_KEYS.printSize),
    printLogoSize: LOGO_PRINT_SIZE[config.logoSize], logoRadius: LOGO_RADIUS[config.logoRadius],
  };
}
