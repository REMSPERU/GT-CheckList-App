import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import type { BaseEquipment, EquipamentoResponse } from '@/types/api';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';
import { supabase } from '@/lib/supabase';
import {
  supabaseChecklistScheduleService,
  type ChecklistSchedule,
} from '@/services/supabase-checklist-schedule.service';

interface BuildingParam {
  id: string;
  name: string;
  address?: string;
  image_url?: string;
}

function parseJsonParam<T>(value: string | string[] | undefined): T | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (typeof rawValue !== 'string') return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateToSpanish(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

function normalizeSearch(val: string) {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface EquipmentListItemProps {
  item: BaseEquipment;
  onPress: (item: BaseEquipment) => void;
  submittedCount: number;
  pendingSyncCount: number;
  conflictCount: number;
  limit: number;
}

function getPeriodFromFrequency(frequencyRaw: string) {
  const frequency = frequencyRaw.toUpperCase();
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (frequency === 'DIARIA' || frequency === 'INTERDIARIA') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (frequency === 'SEMANAL') {
    const day = now.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  } else if (frequency === 'QUINCENAL') {
    start.setDate(now.getDate() <= 15 ? 1 : 16);
    start.setHours(0, 0, 0, 0);

    if (now.getDate() <= 15) {
      end.setDate(15);
      end.setHours(23, 59, 59, 999);
    } else {
      end.setMonth(start.getMonth() + 1, 1);
      end.setTime(end.getTime() - 1);
    }
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(start.getMonth() + 1);
    end.setTime(end.getTime() - 1);
  }

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    periodStart: formatLocalDate(start),
    periodEnd: formatLocalDate(end),
  };
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayInLimaDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year')?.value ?? '1970';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';

  return parseLocalDate(`${year}-${month}-${day}`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
}

function getMonthlyTarget(anchor: Date, reference: Date) {
  const lastDay = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    Math.min(anchor.getDate(), lastDay),
  );
}

function getSchedulePeriodForToday(schedule: ChecklistSchedule) {
  const today = getTodayInLimaDate();
  const anchor = schedule.start_date
    ? parseLocalDate(schedule.start_date)
    : today;
  const rangeDays = schedule.execution_range_days || 1;

  if (today < anchor) {
    return {
      periodStart: formatLocalDate(anchor),
      periodEnd: formatLocalDate(addDays(anchor, rangeDays - 1)),
      isWithinWindow: false,
    };
  }

  if (schedule.frequency === 'DIARIA') {
    return {
      periodStart: formatLocalDate(today),
      periodEnd: formatLocalDate(today),
      isWithinWindow: true,
    };
  }

  if (schedule.frequency === 'MENSUAL') {
    const candidates = [-1, 0, 1]
      .map(offset =>
        getMonthlyTarget(
          anchor,
          new Date(today.getFullYear(), today.getMonth() + offset, 1),
        ),
      )
      .filter(target => target >= anchor)
      .sort((a, b) => b.getTime() - a.getTime());
    const currentTarget = candidates.find(target => {
      const end = addDays(target, rangeDays - 1);
      return today >= target && today <= end;
    });
    const fallbackTarget =
      candidates.find(target => target <= today) ??
      candidates[candidates.length - 1] ??
      anchor;
    const target = currentTarget ?? fallbackTarget;

    return {
      periodStart: formatLocalDate(target),
      periodEnd: formatLocalDate(addDays(target, rangeDays - 1)),
      isWithinWindow: !!currentTarget,
    };
  }

  const cycleDays =
    schedule.frequency === 'INTERDIARIA'
      ? 2
      : schedule.frequency === 'SEMANAL'
        ? 7
        : 15;
  const daysFromAnchor = diffDays(anchor, today);
  const target = addDays(
    anchor,
    Math.floor(daysFromAnchor / cycleDays) * cycleDays,
  );
  const periodEnd = addDays(target, rangeDays - 1);

  return {
    periodStart: formatLocalDate(target),
    periodEnd: formatLocalDate(periodEnd),
    isWithinWindow: today >= target && today <= periodEnd,
  };
}

const EquipmentListItem = React.memo(function EquipmentListItem({
  item,
  onPress,
  submittedCount,
  pendingSyncCount,
  conflictCount,
  limit,
}: EquipmentListItemProps) {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const locationText = [item.ubicacion, item.detalle_ubicacion]
    .filter(Boolean)
    .join(' - ');

  const totalCompleted = submittedCount + pendingSyncCount;
  const isFullyCompleted = totalCompleted >= limit;

  let statusText = '';
  if (conflictCount) {
    statusText = 'Conflicto sync';
  } else if (limit > 1) {
    if (isFullyCompleted) {
      statusText = `Completado (${totalCompleted}/${limit})`;
    } else if (totalCompleted > 0) {
      statusText = `Avance (${totalCompleted}/${limit})`;
    } else {
      statusText = `Pendiente (0/${limit})`;
    }
  } else {
    if (pendingSyncCount > 0) {
      statusText = 'Completado · sync pendiente';
    } else if (totalCompleted > 0) {
      statusText = 'Completado';
    } else {
      statusText = 'Pendiente';
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        !isFullyCompleted && styles.itemCardPending,
        pressed && styles.itemCardPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Equipo ${item.codigo || 'sin codigo'}`}>
      <View
        style={[
          styles.itemIconWrap,
          !isFullyCompleted && styles.itemIconWrapPending,
        ]}>
        <Ionicons
          name={isFullyCompleted ? 'checkmark-done' : 'alert-circle-outline'}
          size={22}
          color={isFullyCompleted ? '#0891B2' : '#EF4444'}
        />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle}>{item.codigo || 'Sin codigo'}</Text>
          <View
            style={[
              styles.statusBadge,
              isFullyCompleted
                ? styles.statusBadgeCompleted
                : styles.statusBadgePending,
            ]}>
            <Text
              style={[
                styles.statusBadgeText,
                isFullyCompleted
                  ? styles.statusBadgeTextCompleted
                  : styles.statusBadgeTextPending,
              ]}>
              {statusText}
            </Text>
          </View>
        </View>
        <Text style={styles.itemSubtitle}>
          {locationText || 'Sin ubicacion'}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </Pressable>
  );
});

export default function EquipmentChecklistListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const building = useMemo<BuildingParam | null>(() => {
    const buildingId = getSingleParam(params.buildingId);
    const buildingName = getSingleParam(params.buildingName);
    const buildingAddress = getSingleParam(params.buildingAddress);
    const buildingImageUrl = getSingleParam(params.buildingImageUrl);

    if (buildingId && buildingName) {
      return {
        id: buildingId,
        name: buildingName,
        address: buildingAddress,
        image_url: buildingImageUrl,
      };
    }

    return parseJsonParam<BuildingParam>(params.building);
  }, [
    params.building,
    params.buildingAddress,
    params.buildingId,
    params.buildingImageUrl,
    params.buildingName,
  ]);

  const equipamento = useMemo<EquipamentoResponse | null>(() => {
    const equipamentoId = getSingleParam(params.equipamentoId);
    const equipamentoNombre = getSingleParam(params.equipamentoNombre);
    const equipamentoFrecuencia = getSingleParam(params.equipamentoFrecuencia);
    const equipamentoAbreviatura = getSingleParam(
      params.equipamentoAbreviatura,
    );

    if (equipamentoId && equipamentoNombre) {
      return {
        id: equipamentoId,
        nombre: equipamentoNombre,
        frecuencia: equipamentoFrecuencia ?? 'MENSUAL',
        abreviatura: equipamentoAbreviatura ?? '',
      } as EquipamentoResponse;
    }

    return parseJsonParam<EquipamentoResponse>(params.equipamento);
  }, [
    params.equipamento,
    params.equipamentoAbreviatura,
    params.equipamentoFrecuencia,
    params.equipamentoId,
    params.equipamentoNombre,
  ]);

  const [equipos, setEquipos] = useState<BaseEquipment[]>([]);
  const [searchText, setSearchText] = useState('');
  const [submittedCountByEquipo, setSubmittedCountByEquipo] = useState<
    Record<string, number>
  >({});
  const [pendingSyncCountByEquipo, setPendingSyncCountByEquipo] = useState<
    Record<string, number>
  >({});
  const [conflictCountByEquipo, setConflictCountByEquipo] = useState<
    Record<string, number>
  >({});
  const [progressSummary, setProgressSummary] = useState({
    completed: 0,
    total: 0,
  });
  const [scheduleState, setScheduleState] = useState<{
    hasSchedule: boolean;
    isActive: boolean;
    frequency: string;
    occurrencesPerDay: number;
    message: string;
  }>({
    hasSchedule: false,
    isActive: false,
    frequency: 'MENSUAL',
    occurrencesPerDay: 1,
    message: 'Sin programacion activa. Se controla por periodo.',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filteredEquipos = useMemo(() => {
    if (!equipos) return [];
    const q = normalizeSearch(searchText);
    if (!q) return equipos;

    return equipos.filter(
      e =>
        normalizeSearch(e.codigo || '').includes(q) ||
        normalizeSearch(e.ubicacion || '').includes(q) ||
        normalizeSearch(e.detalle_ubicacion || '').includes(q)
    );
  }, [equipos, searchText]);

  useEffect(() => {
    if (!building?.id || !equipamento?.id) {
      setIsLoading(false);
    }
  }, [building?.id, equipamento?.id]);

  const loadChecklistStatus = useCallback(
    async (equipmentRows: BaseEquipment[]) => {
      if (!building?.id || !equipamento?.id) {
        return;
      }

      let effectiveFrequency =
        equipamento.frecuencia?.toUpperCase().trim() || 'MENSUAL';
      let periodStart = getPeriodFromFrequency(effectiveFrequency).periodStart;

      try {
        const schedule =
          await supabaseChecklistScheduleService.getScheduleByScope(
            building.id,
            equipamento.id,
          );

        const isScheduleActive = !!schedule?.is_active;
        effectiveFrequency =
          (isScheduleActive ? schedule?.frequency : equipamento.frecuencia)
            ?.toUpperCase()
            .trim() || 'MENSUAL';
        const schedulePeriod =
          isScheduleActive && schedule
            ? getSchedulePeriodForToday(schedule)
            : null;
        periodStart = schedulePeriod
          ? schedulePeriod.periodStart
          : getPeriodFromFrequency(effectiveFrequency).periodStart;

        const frequencyFriendly =
          effectiveFrequency.charAt(0).toUpperCase() +
          effectiveFrequency.slice(1).toLowerCase();

        const message = isScheduleActive
          ? schedulePeriod?.isWithinWindow
            ? schedulePeriod.periodStart === schedulePeriod.periodEnd
              ? `Programación ${frequencyFriendly}: para el ${formatDateToSpanish(schedulePeriod.periodStart)}`
              : `Programación ${frequencyFriendly}: del ${formatDateToSpanish(schedulePeriod.periodStart)} al ${formatDateToSpanish(schedulePeriod.periodEnd)}`
            : `Programación ${frequencyFriendly}: hoy fuera de rango de ejecución`
          : 'Sin programación activa (control por período)';

        setScheduleState({
          hasSchedule: !!schedule,
          isActive: isScheduleActive,
          frequency: effectiveFrequency,
          occurrencesPerDay: schedule?.occurrences_per_day || 1,
          message,
        });

        if (equipmentRows.length === 0) {
          setSubmittedCountByEquipo({});
          setPendingSyncCountByEquipo({});
          setConflictCountByEquipo({});
          setProgressSummary({ completed: 0, total: 0 });
          return;
        }

        const equipmentIds = equipmentRows.map(item => item.id);
        const localCounts = await DatabaseService.getChecklistCountsByEquipo(
          building.id,
          equipamento.id,
          effectiveFrequency,
          periodStart,
        );
        const { data, error } = await supabase
          .from('checklist_response')
          .select('equipo_id')
          .eq('frequency', effectiveFrequency)
          .eq('period_start', periodStart)
          .in('equipo_id', equipmentIds);

        if (error) {
          throw error;
        }

        const counts = (data || []).reduce<Record<string, number>>(
          (acc, row) => {
            const equipoId = String(row.equipo_id || '');
            if (!equipoId) {
              return acc;
            }
            acc[equipoId] = (acc[equipoId] || 0) + 1;
            return acc;
          },
          {},
        );

        const pendingCounts = localCounts.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.equipo_id] = Number(row.pending_count || 0);
            return acc;
          },
          {},
        );
        const conflictCounts = localCounts.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.equipo_id] = Number(row.conflict_count || 0);
            return acc;
          },
          {},
        );

        setSubmittedCountByEquipo(counts);
        setPendingSyncCountByEquipo(pendingCounts);
        setConflictCountByEquipo(conflictCounts);
        const completedCount = equipmentRows.reduce(
          (acc, item) =>
            counts[item.id] > 0 || pendingCounts[item.id] > 0 ? acc + 1 : acc,
          0,
        );
        setProgressSummary({
          completed: completedCount,
          total: equipmentRows.length,
        });
      } catch (error) {
        console.error('Error loading checklist status:', error);
        const localCounts = await DatabaseService.getChecklistCountsByEquipo(
          building.id,
          equipamento.id,
          effectiveFrequency,
          periodStart,
        );
        const syncedCounts = localCounts.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.equipo_id] = Number(row.synced_count || 0);
            return acc;
          },
          {},
        );
        const pendingCounts = localCounts.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.equipo_id] = Number(row.pending_count || 0);
            return acc;
          },
          {},
        );
        const conflictCounts = localCounts.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.equipo_id] = Number(row.conflict_count || 0);
            return acc;
          },
          {},
        );
        setSubmittedCountByEquipo(syncedCounts);
        setPendingSyncCountByEquipo(pendingCounts);
        setConflictCountByEquipo(conflictCounts);
        setProgressSummary({
          completed: equipmentRows.reduce(
            (acc, item) =>
              syncedCounts[item.id] > 0 || pendingCounts[item.id] > 0
                ? acc + 1
                : acc,
            0,
          ),
          total: equipmentRows.length,
        });
        setScheduleState(prev => ({
          ...prev,
          message:
            'No se pudo validar la programación. Deslice para actualizar.',
        }));
      }
    },
    [building?.id, equipamento?.frecuencia, equipamento?.id],
  );

  const loadData = useCallback(async () => {
    if (!building?.id || !equipamento?.id) return;

    setIsLoading(true);
    try {
      const data = await DatabaseService.getEquipmentByProperty(building.id, {
        equipamentoId: equipamento.id,
      });
      const normalizedData = data as BaseEquipment[];
      setEquipos(normalizedData);
      await loadChecklistStatus(normalizedData);
    } catch (error) {
      console.error('Error loading checklist equipment list:', error);
      setEquipos([]);
      setSubmittedCountByEquipo({});
      setPendingSyncCountByEquipo({});
      setConflictCountByEquipo({});
      setProgressSummary({ completed: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [building?.id, equipamento?.id, loadChecklistStatus]);

  useEffect(() => {
    if (building?.id && equipamento?.id) {
      loadData();
    }
  }, [building?.id, equipamento?.id, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncService.triggerSync('checklist-index-refresh', { force: true });
      await loadData();
    } catch (error) {
      console.error('Checklist list refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const frequencyLabel = useMemo(
    () =>
      (
        scheduleState.frequency ||
        equipamento?.frecuencia ||
        'MENSUAL'
      ).toUpperCase(),
    [equipamento?.frecuencia, scheduleState.frequency],
  );

  const handlePressEquipment = useCallback(
    (equipo: BaseEquipment) => {
      if (!equipamento) return;

      router.push({
        pathname: '/checklist/form',
        params: {
          buildingId: building?.id || '',
          buildingName: building?.name || '',
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
          frecuencia:
            scheduleState.frequency || equipamento.frecuencia || 'MENSUAL',
          equipoId: equipo.id,
          equipoCodigo: equipo.codigo,
          equipoUbicacion: equipo.ubicacion,
          equipoDetalleUbicacion: equipo.detalle_ubicacion,
        },
      });
    },
    [
      building?.id,
      building?.name,
      equipamento,
      router,
      scheduleState.frequency,
    ],
  );

  const renderEquipmentItem = useCallback(
    ({ item }: { item: BaseEquipment }) => (
      <EquipmentListItem
        item={item}
        onPress={handlePressEquipment}
        submittedCount={submittedCountByEquipo[item.id] || 0}
        pendingSyncCount={pendingSyncCountByEquipo[item.id] || 0}
        conflictCount={conflictCountByEquipo[item.id] || 0}
        limit={scheduleState.occurrencesPerDay || 1}
      />
    ),
    [
      conflictCountByEquipo,
      handlePressEquipment,
      pendingSyncCountByEquipo,
      submittedCountByEquipo,
      scheduleState.occurrencesPerDay,
    ],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {building?.image_url ? (
          <Image
            source={{ uri: building.image_url }}
            style={styles.headerImage}
          />
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
        <View style={styles.headerOverlay} />
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { top: insets.top + 8 },
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>
            {equipamento?.nombre || 'Checklist'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {building?.name || '-'} - {frequencyLabel}
          </Text>
        </View>
      </View>

      {!isLoading ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Estado del dia</Text>
          <Text style={styles.summaryText}>{scheduleState.message}</Text>
          <Text style={styles.summaryProgress}>
            Avance: {progressSummary.completed} de {progressSummary.total}{' '}
            equipos completados
          </Text>
        </View>
      ) : null}

      {/* Search */}
      {!isLoading && equipos && equipos.length > 0 && (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código o ubicación..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0891B2" />
        </View>
      ) : (
        <FlatList
          data={filteredEquipos}
          keyExtractor={item => item.id}
          renderItem={renderEquipmentItem}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyText}>
                {searchText
                  ? `Sin resultados para "${searchText}"`
                  : 'No hay equipos para este tipo.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    height: 148,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  headerTextWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemCardPending: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  itemCardPressed: {
    opacity: 0.8,
  },
  itemBody: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextCompleted: {
    color: '#166534',
  },
  statusBadgeTextPending: {
    color: '#92400E',
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconWrapPending: {
    backgroundColor: '#FEE2E2',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryText: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '600',
  },
  summaryTextMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryProgress: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
});
