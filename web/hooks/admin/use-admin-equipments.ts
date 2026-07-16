import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getSupabaseClient } from '@/lib/supabase-browser';
import { listAdminEquipmentTypes } from '@/services/admin/equipment-types.service';
import {
  listAdminEquipments,
  getDistinctEquipmentDetailTypes,
} from '@/services/admin/equipments.service';
import { listAdminProperties } from '@/services/admin/properties.service';
import type {
  AdminEquipmentRow,
  AdminEquipmentTypeRow,
  AdminPropertyRow,
} from '@/types/admin';

import { useDebouncedValue } from './use-debounced-value';

const PAGE_SIZE = 50;

export function useAdminEquipments() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Helper to update URL params
  const updateUrlParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [items, setItems] = useState<AdminEquipmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [propertyId, setPropertyId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [config, setConfig] = useState('TODOS');
  const [city, setCity] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [fases, setFases] = useState('');
  const [voltaje, setVoltaje] = useState('');
  const [tipoTablero, setTipoTablero] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [potencia, setPotencia] = useState('');
  const [rpm, setRpm] = useState('');
  const [presion, setPresion] = useState('');
  const [refrigerante, setRefrigerante] = useState('');
  const [tieneVdf, setTieneVdf] = useState('TODOS');
  const [tipo, setTipo] = useState('');
  const [distinctTipos, setDistinctTipos] = useState<string[]>([]);
  const [brands, setBrands] = useState<{ id: string; nombre: string }[]>([]);

  const [availableEquipmentTypeIds, setAvailableEquipmentTypeIds] = useState<
    string[] | null
  >(null);
  const [properties, setProperties] = useState<AdminPropertyRow[]>([]);
  const [systems, setSystems] = useState<{ id: string; nombre: string }[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<AdminEquipmentTypeRow[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  // Tracks the values last synced FROM the URL so we can detect real navigation changes
  // without including local state in the effect's dependency array (which caused a
  // write-then-overwrite loop on every keystroke).
  const lastSyncedFromUrl = useRef({
    search: '',
    status: 'TODOS',
    propertyId: '',
    systemId: '',
    equipmentTypeId: '',
    config: 'TODOS',
    city: '',
    frecuencia: '',
    fases: '',
    voltaje: '',
    tipoTablero: '',
    marca: '',
    modelo: '',
    serie: '',
    capacidad: '',
    potencia: '',
    rpm: '',
    presion: '',
    refrigerante: '',
    tieneVdf: 'TODOS',
    tipo: '',
    page: 1,
  });

  // Synchronize URL search params to React state (handles back/forward navigation)
  useEffect(() => {
    const searchVal = searchParams.get('search') ?? '';
    const statusVal = searchParams.get('status') ?? 'TODOS';
    const propertyVal = searchParams.get('property') ?? '';
    const systemVal = searchParams.get('system') ?? '';
    const eqTypeVal = searchParams.get('eqType') ?? '';
    const configVal = searchParams.get('config') ?? 'TODOS';
    const cityVal = searchParams.get('city') ?? '';
    const freqVal = searchParams.get('frecuencia') ?? '';
    const fasesVal = searchParams.get('fases') ?? '';
    const voltVal = searchParams.get('voltaje') ?? '';
    const tipoTableroVal = searchParams.get('tipoTablero') ?? '';
    const marcaVal = searchParams.get('marca') ?? '';
    const modeloVal = searchParams.get('modelo') ?? '';
    const serieVal = searchParams.get('serie') ?? '';
    const capacidadVal = searchParams.get('capacidad') ?? '';
    const potenciaVal = searchParams.get('potencia') ?? '';
    const rpmVal = searchParams.get('rpm') ?? '';
    const presionVal = searchParams.get('presion') ?? '';
    const refrigVal = searchParams.get('refrigerante') ?? '';
    const tieneVdfVal = searchParams.get('tieneVdf') ?? 'TODOS';
    const tipoVal = searchParams.get('tipo') ?? '';
    const pageVal = Number(searchParams.get('page') ?? '1');

    const prev = lastSyncedFromUrl.current;

    if (searchVal !== prev.search) setSearch(searchVal);
    if (statusVal !== prev.status) setStatus(statusVal);
    if (propertyVal !== prev.propertyId) setPropertyId(propertyVal);
    if (systemVal !== prev.systemId) setSystemId(systemVal);
    if (eqTypeVal !== prev.equipmentTypeId) setEquipmentTypeId(eqTypeVal);
    if (configVal !== prev.config) setConfig(configVal);
    if (cityVal !== prev.city) setCity(cityVal);
    if (freqVal !== prev.frecuencia) setFrecuencia(freqVal);
    if (fasesVal !== prev.fases) setFases(fasesVal);
    if (voltVal !== prev.voltaje) setVoltaje(voltVal);
    if (tipoTableroVal !== prev.tipoTablero) setTipoTablero(tipoTableroVal);
    if (marcaVal !== prev.marca) setMarca(marcaVal);
    if (modeloVal !== prev.modelo) setModelo(modeloVal);
    if (serieVal !== prev.serie) setSerie(serieVal);
    if (capacidadVal !== prev.capacidad) setCapacidad(capacidadVal);
    if (potenciaVal !== prev.potencia) setPotencia(potenciaVal);
    if (rpmVal !== prev.rpm) setRpm(rpmVal);
    if (presionVal !== prev.presion) setPresion(presionVal);
    if (refrigVal !== prev.refrigerante) setRefrigerante(refrigVal);
    if (tieneVdfVal !== prev.tieneVdf) setTieneVdf(tieneVdfVal);
    if (tipoVal !== prev.tipo) setTipo(tipoVal);
    if (pageVal !== prev.page) setPage(pageVal);

    lastSyncedFromUrl.current = {
      search: searchVal,
      status: statusVal,
      propertyId: propertyVal,
      systemId: systemVal,
      equipmentTypeId: eqTypeVal,
      config: configVal,
      city: cityVal,
      frecuencia: freqVal,
      fases: fasesVal,
      voltaje: voltVal,
      tipoTablero: tipoTableroVal,
      marca: marcaVal,
      modelo: modeloVal,
      serie: serieVal,
      capacidad: capacidadVal,
      potencia: potenciaVal,
      rpm: rpmVal,
      presion: presionVal,
      refrigerante: refrigVal,
      tieneVdf: tieneVdfVal,
      tipo: tipoVal,
      page: pageVal,
    };
  }, [searchParams]);

  // Synchronize debounced search text back to URL
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (debouncedSearch !== urlSearch) {
      updateUrlParams({ search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Load filter options (properties, systems and equipment types) once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFilterOptions() {
      try {
        const supabase = getSupabaseClient();
        const [props, types, systemsRes, brandsRes] = await Promise.all([
          listAdminProperties(supabase),
          listAdminEquipmentTypes(supabase),
          supabase
            .from('sistemas')
            .select('id, nombre')
            .order('nombre', { ascending: true }),
          supabase
            .from('marca')
            .select('id, nombre')
            .order('nombre', { ascending: true }),
        ]);
        if (isMounted) {
          setProperties(props);
          setEquipmentTypes(types);
          setSystems(
            (systemsRes.data ?? []) as { id: string; nombre: string }[],
          );
          setBrands((brandsRes.data ?? []) as { id: string; nombre: string }[]);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    }
    void loadFilterOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load unique detail types whenever major filters change
  useEffect(() => {
    let isMounted = true;
    async function loadDistinctTipos() {
      try {
        const supabase = getSupabaseClient();
        const types = await getDistinctEquipmentDetailTypes(supabase, {
          propertyId,
          systemId,
          equipmentTypeId,
        });
        if (isMounted) {
          setDistinctTipos(types);
        }
      } catch (error) {
        console.error('Error loading distinct detail types:', error);
      }
    }
    void loadDistinctTipos();
    return () => {
      isMounted = false;
    };
  }, [propertyId, systemId, equipmentTypeId]);

  // Reset selected detail type if it is no longer available in the newly filtered set of distinct types
  useEffect(() => {
    if (tipo && distinctTipos.length > 0 && !distinctTipos.includes(tipo)) {
      setTipo('');
      updateUrlParams({ tipo: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distinctTipos, tipo]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    status,
    propertyId,
    systemId,
    equipmentTypeId,
    config,
    city,
    frecuencia,
    fases,
    voltaje,
    tipoTablero,
    marca,
    modelo,
    serie,
    capacidad,
    potencia,
    rpm,
    presion,
    refrigerante,
    tieneVdf,
    tipo,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipments() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const supabase = getSupabaseClient();
        const result = await listAdminEquipments(supabase, {
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          status,
          propertyId,
          systemId,
          equipmentTypeId,
          config,
          city,
          frecuencia,
          fases,
          voltaje,
          tipoTablero,
          marca,
          modelo,
          serie,
          capacidad,
          potencia,
          rpm,
          presion,
          refrigerante,
          tieneVdf,
          tipo,
        });
        if (isMounted) {
          setItems(result.items);
          setTotal(result.total);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los activos',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadEquipments();

    return () => {
      isMounted = false;
    };
  }, [
    debouncedSearch,
    page,
    status,
    propertyId,
    systemId,
    equipmentTypeId,
    config,
    city,
    frecuencia,
    fases,
    voltaje,
    tipoTablero,
    marca,
    modelo,
    serie,
    capacidad,
    potencia,
    rpm,
    presion,
    refrigerante,
    tieneVdf,
    tipo,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  // Load unique equipment types present in the selected property
  useEffect(() => {
    let isMounted = true;
    async function loadAvailableTypes() {
      if (!propertyId) {
        if (isMounted) setAvailableEquipmentTypeIds(null);
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const allIds: string[] = [];
        let pageNum = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const fromIdx = pageNum * pageSize;
          const toIdx = fromIdx + pageSize - 1;

          const { data, error } = await supabase
            .from('equipos')
            .select('id_equipamento')
            .eq('id_property', propertyId)
            .range(fromIdx, toIdx);

          if (error) throw error;

          if (data && data.length > 0) {
            data.forEach(item => {
              if (item.id_equipamento) {
                allIds.push(item.id_equipamento);
              }
            });
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              pageNum++;
            }
          } else {
            hasMore = false;
          }
        }

        if (isMounted) {
          setAvailableEquipmentTypeIds(Array.from(new Set(allIds)));
        }
      } catch (error) {
        console.error(
          'Error loading available equipment types for property:',
          error,
        );
      }
    }
    void loadAvailableTypes();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  // Reset selected equipment type if it is no longer available in the newly filtered set
  useEffect(() => {
    if (
      availableEquipmentTypeIds &&
      equipmentTypeId &&
      !availableEquipmentTypeIds.includes(equipmentTypeId)
    ) {
      setEquipmentTypeId('');
    }
  }, [availableEquipmentTypeIds, equipmentTypeId]);

  function handleStatusChange(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
    updateUrlParams({ status: nextStatus, page: 1 });
  }

  function handlePropertyChange(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setPage(1);
    updateUrlParams({ property: nextPropertyId, page: 1 });
  }

  function handleSystemChange(nextSystemId: string) {
    setSystemId(nextSystemId);
    setEquipmentTypeId('');
    setFases('');
    setVoltaje('');
    setTipoTablero('');
    setMarca('');
    setModelo('');
    setSerie('');
    setCapacidad('');
    setPotencia('');
    setRpm('');
    setPresion('');
    setRefrigerante('');
    setTieneVdf('TODOS');
    setTipo('');
    setPage(1);
    updateUrlParams({
      system: nextSystemId,
      eqType: '',
      fases: null,
      voltaje: null,
      tipoTablero: null,
      marca: null,
      modelo: null,
      serie: null,
      capacidad: null,
      potencia: null,
      rpm: null,
      presion: null,
      refrigerante: null,
      tieneVdf: null,
      tipo: null,
      page: 1,
    });
  }

  function handleEquipmentTypeChange(nextEquipmentTypeId: string) {
    setEquipmentTypeId(nextEquipmentTypeId);
    setFases('');
    setVoltaje('');
    setTipoTablero('');
    setMarca('');
    setModelo('');
    setSerie('');
    setCapacidad('');
    setPotencia('');
    setRpm('');
    setPresion('');
    setRefrigerante('');
    setTieneVdf('TODOS');
    setTipo('');
    setPage(1);
    updateUrlParams({
      eqType: nextEquipmentTypeId,
      fases: null,
      voltaje: null,
      tipoTablero: null,
      marca: null,
      modelo: null,
      serie: null,
      capacidad: null,
      potencia: null,
      rpm: null,
      presion: null,
      refrigerante: null,
      tieneVdf: null,
      tipo: null,
      page: 1,
    });
  }

  function handleConfigChange(nextConfig: string) {
    setConfig(nextConfig);
    setPage(1);
    updateUrlParams({ config: nextConfig, page: 1 });
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    setPage(1);
    updateUrlParams({ city: nextCity, page: 1 });
  }

  function handleFrecuenciaChange(nextFrecuencia: string) {
    setFrecuencia(nextFrecuencia);
    setPage(1);
    updateUrlParams({ frecuencia: nextFrecuencia, page: 1 });
  }

  function handleFasesChange(nextFases: string) {
    setFases(nextFases);
    setPage(1);
    updateUrlParams({ fases: nextFases, page: 1 });
  }

  function handleVoltajeChange(nextVoltaje: string) {
    setVoltaje(nextVoltaje);
    setPage(1);
    updateUrlParams({ voltaje: nextVoltaje, page: 1 });
  }

  function handleTipoTableroChange(nextTipoTablero: string) {
    setTipoTablero(nextTipoTablero);
    setPage(1);
    updateUrlParams({ tipoTablero: nextTipoTablero, page: 1 });
  }

  function handleMarcaChange(nextMarca: string) {
    setMarca(nextMarca);
    setPage(1);
    updateUrlParams({ marca: nextMarca || null, page: 1 });
  }

  function handleModeloChange(nextModelo: string) {
    setModelo(nextModelo);
    setPage(1);
    updateUrlParams({ modelo: nextModelo || null, page: 1 });
  }

  function handleSerieChange(nextSerie: string) {
    setSerie(nextSerie);
    setPage(1);
    updateUrlParams({ serie: nextSerie || null, page: 1 });
  }

  function handleCapacidadChange(nextCapacidad: string) {
    setCapacidad(nextCapacidad);
    setPage(1);
    updateUrlParams({ capacidad: nextCapacidad || null, page: 1 });
  }

  function handlePotenciaChange(nextPotencia: string) {
    setPotencia(nextPotencia);
    setPage(1);
    updateUrlParams({ potencia: nextPotencia || null, page: 1 });
  }

  function handleRpmChange(nextRpm: string) {
    setRpm(nextRpm);
    setPage(1);
    updateUrlParams({ rpm: nextRpm || null, page: 1 });
  }

  function handlePresionChange(nextPresion: string) {
    setPresion(nextPresion);
    setPage(1);
    updateUrlParams({ presion: nextPresion || null, page: 1 });
  }

  function handleRefrigeranteChange(nextRefrigerante: string) {
    setRefrigerante(nextRefrigerante);
    setPage(1);
    updateUrlParams({ refrigerante: nextRefrigerante || null, page: 1 });
  }

  function handleTieneVdfChange(nextTieneVdf: string) {
    setTieneVdf(nextTieneVdf);
    setPage(1);
    updateUrlParams({ tieneVdf: nextTieneVdf, page: 1 });
  }

  function handleTipoChange(nextTipo: string) {
    setTipo(nextTipo);
    setPage(1);
    updateUrlParams({ tipo: nextTipo || null, page: 1 });
  }

  function clearFilters() {
    setStatus('TODOS');
    setPropertyId('');
    setSystemId('');
    setEquipmentTypeId('');
    setConfig('TODOS');
    setCity('');
    setFrecuencia('');
    setFases('');
    setVoltaje('');
    setTipoTablero('');
    setMarca('');
    setModelo('');
    setSerie('');
    setCapacidad('');
    setPotencia('');
    setRpm('');
    setPresion('');
    setRefrigerante('');
    setTieneVdf('TODOS');
    setTipo('');
    setPage(1);
    updateUrlParams({
      status: null,
      property: null,
      system: null,
      eqType: null,
      config: null,
      city: null,
      frecuencia: null,
      fases: null,
      voltaje: null,
      tipoTablero: null,
      marca: null,
      modelo: null,
      serie: null,
      capacidad: null,
      potencia: null,
      rpm: null,
      presion: null,
      refrigerante: null,
      tieneVdf: null,
      tipo: null,
      page: 1,
    });
  }

  return {
    items,
    search,
    setSearch,
    status,
    handleStatusChange,
    propertyId,
    handlePropertyChange,
    systemId,
    handleSystemChange,
    equipmentTypeId,
    handleEquipmentTypeChange,
    config,
    handleConfigChange,
    city,
    handleCityChange,
    frecuencia,
    handleFrecuenciaChange,
    fases,
    handleFasesChange,
    voltaje,
    handleVoltajeChange,
    tipoTablero,
    handleTipoTableroChange,
    marca,
    handleMarcaChange,
    modelo,
    handleModeloChange,
    serie,
    handleSerieChange,
    capacidad,
    handleCapacidadChange,
    potencia,
    handlePotenciaChange,
    rpm,
    handleRpmChange,
    presion,
    handlePresionChange,
    refrigerante,
    handleRefrigeranteChange,
    tieneVdf,
    handleTieneVdfChange,
    tipo,
    handleTipoChange,
    distinctTipos,
    clearFilters,
    availableEquipmentTypeIds,
    properties,
    systems,
    equipmentTypes,
    brands,
    page,
    setPage: (nextPage: number) => {
      setPage(nextPage);
      updateUrlParams({ page: nextPage });
    },
    total,
    totalPages,
    isLoading,
    errorMessage,
  };
}
