import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSessions } from '@/hooks/use-maintenance';
import { syncService } from '@/services/sync';

type SessionStatusFilter =
  | 'TODOS'
  | 'NO_INICIADO'
  | 'EN_PROGRESO'
  | 'COMPLETADO';

type SessionSortOrder = 'RECIENTES' | 'ANTIGUOS';

interface SessionListItem {
  id: string | number;
  nombre: string;
  descripcion?: string | null;
  fecha_programada?: string | null;
  total: number;
  completed: number;
  inProgress: number;
  equipmentTypes?: string[];
}

interface FilterOption {
  key: SessionStatusFilter;
  label: string;
}

export default function MaintenanceSessionScreen() {
  const router = useRouter();
  const { propertyId, propertyName } = useLocalSearchParams<{
    propertyId?: string;
    propertyName?: string;
  }>();

  const {
    data: sessions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceSessions(propertyId ?? '');
  const typedSessions = useMemo(
    () => sessions as SessionListItem[],
    [sessions],
  );
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] =
    useState<SessionStatusFilter>('TODOS');
  const [sortOrder, setSortOrder] = useState<SessionSortOrder>('RECIENTES');

  const runRefresh = useCallback(
    async (forcePull = false) => {
      await syncService.triggerSync(
        forcePull ? 'maintenance-session-refresh' : 'maintenance-session-focus',
        { force: forcePull },
      );
      await refetch();
    },
    [refetch],
  );

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await runRefresh(true);
    } catch (error) {
      console.error('Manual refresh failed in maintenance-session:', error);
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch, runRefresh]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void runRefresh();
    }, [runRefresh]),
  );

  const getSessionStatus = useCallback((session: SessionListItem) => {
    if (session.total > 0 && session.completed === session.total) {
      return { label: 'COMPLETADO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    if (session.completed > 0 || session.inProgress > 0) {
      return { label: 'EN PROGRESO', color: '#06B6D4', bgColor: '#CFFAFE' };
    }
    return { label: 'NO INICIADO', color: '#6B7280', bgColor: '#F3F4F6' };
  }, []);

  const getProgressPercentage = useCallback((session: SessionListItem) => {
    if (!session.total || session.total === 0) return 0;
    return (session.completed / session.total) * 100;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = dateStr.includes('T')
      ? new Date(dateStr)
      : new Date(dateStr + 'T12:00:00');
    if (isNaN(dateObj.getTime())) return dateStr;
    const formatted = dateObj.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const getEquipmentTypeConfig = useCallback((type: string) => {
    switch (type) {
      case 'Luces de Emergencia':
        return {
          icon: 'lightbulb-on-outline' as const,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          label: 'Luces de Emergencia',
        };
      case 'Tablero Electrico':
        return {
          icon: 'flash-outline' as const,
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          label: 'Tablero Eléctrico',
        };
      case 'Pozo a Tierra':
        return {
          icon: 'earth' as const,
          color: '#10B981',
          bgColor: '#D1FAE5',
          label: 'Pozo a Tierra',
        };
      default:
        return {
          icon: 'wrench-outline' as const,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          label: type,
        };
    }
  }, []);

  const handleSessionPress = useCallback(
    (session: SessionListItem) => {
      router.push({
        pathname:
          '/maintenance/scheduled_maintenance/equipment-maintenance-list',
        params: {
          propertyId,
          sessionId: session.id,
          sessionName: session.nombre,
          propertyName,
        },
      });
    },
    [propertyId, propertyName, router],
  );

  const filteredSessions = useMemo(() => {
    return typedSessions.filter(session => {
      if (selectedStatus === 'TODOS') return true;

      const isCompleted =
        session.total > 0 && session.completed === session.total;
      const isInProgress = session.completed > 0 || session.inProgress > 0;

      if (selectedStatus === 'COMPLETADO') return isCompleted;
      if (selectedStatus === 'EN_PROGRESO') return !isCompleted && isInProgress;
      if (selectedStatus === 'NO_INICIADO')
        return !isCompleted && !isInProgress;

      return true;
    });
  }, [selectedStatus, typedSessions]);

  const sortedSessions = useMemo(() => {
    const getDateValue = (session: SessionListItem) => {
      if (!session.fecha_programada) return 0;
      const parsedDate = session.fecha_programada.includes('T')
        ? new Date(session.fecha_programada)
        : new Date(session.fecha_programada + 'T12:00:00');

      return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
    };

    return [...filteredSessions].sort((a, b) => {
      const dateA = getDateValue(a);
      const dateB = getDateValue(b);
      return sortOrder === 'RECIENTES' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredSessions, sortOrder]);

  const statusFilters = useMemo<FilterOption[]>(
    () => [
      { key: 'TODOS', label: 'Todos' },
      { key: 'NO_INICIADO', label: 'No iniciado' },
      { key: 'EN_PROGRESO', label: 'En progreso' },
      { key: 'COMPLETADO', label: 'Completado' },
    ],
    [],
  );

  const sortLabel =
    sortOrder === 'RECIENTES' ? 'Mas recientes' : 'Mas antiguos';

  const toggleSortOrder = useCallback(() => {
    setSortOrder(current =>
      current === 'RECIENTES' ? 'ANTIGUOS' : 'RECIENTES',
    );
  }, []);

  const renderStatusFilterItem = useCallback<ListRenderItem<FilterOption>>(
    ({ item }) => {
      const isSelected = selectedStatus === item.key;

      return (
        <Pressable
          onPress={() => setSelectedStatus(item.key)}
          style={[styles.filterChip, isSelected && styles.filterChipSelected]}>
          <Text
            style={[
              styles.filterChipText,
              isSelected && styles.filterChipTextSelected,
            ]}>
            {item.label}
          </Text>
        </Pressable>
      );
    },
    [selectedStatus],
  );

  const renderSessionCard = useCallback<ListRenderItem<SessionListItem>>(
    ({ item: session }) => {
      const status = getSessionStatus(session);
      const progress = getProgressPercentage(session);
      const isComplete =
        session.total > 0 && session.completed === session.total;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.sessionCard,
            pressed && styles.cardPressed,
          ]}
          onPress={() => handleSessionPress(session)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir sesión ${session.nombre}`}
          accessibilityHint="Navega a la lista de equipos de esta sesión">
          <View style={styles.cardHeader}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
              <Text style={styles.sessionName} numberOfLines={2}>
                {session.nombre}
              </Text>
            </View>

            {session.fecha_programada && (
              <Text style={styles.dateSubText}>
                {formatDate(session.fecha_programada)}
              </Text>
            )}

            {session.descripcion && (
              <Text style={styles.descriptionText} numberOfLines={2}>
                {session.descripcion}
              </Text>
            )}
          </View>

          {session.equipmentTypes && session.equipmentTypes.length > 0 && (
            <View style={styles.equipmentTypesRow}>
              {session.equipmentTypes.map((type: string, idx: number) => {
                const config = getEquipmentTypeConfig(type);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.equipmentTypeChip,
                      { backgroundColor: config.bgColor },
                    ]}>
                    <MaterialCommunityIcons
                      name={config.icon}
                      size={14}
                      color={config.color}
                    />
                    <Text
                      style={[
                        styles.equipmentTypeText,
                        { color: config.color },
                      ]}
                      numberOfLines={1}>
                      {config.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: status.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {session.completed}/{session.total} equipos
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            {!isComplete && (
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            )}
          </View>
        </Pressable>
      );
    },
    [
      formatDate,
      getEquipmentTypeConfig,
      getProgressPercentage,
      getSessionStatus,
      handleSessionPress,
    ],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaintenanceHeader
          title="Sesiones de Mantenimiento"
          iconName="home-repair-service"
        />

        {propertyName && (
          <View style={styles.propertyBadge}>
            <Ionicons name="business-outline" size={18} color="#06B6D4" />
            <Text style={styles.propertyName}>{propertyName}</Text>
          </View>
        )}

        {!propertyId ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="business" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              Selecciona un inmueble desde Inicio para continuar
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : (
          <>
            <View style={styles.filtersSection}>
              <FlatList
                horizontal
                data={statusFilters}
                keyExtractor={item => item.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterListContent}
                renderItem={renderStatusFilterItem}
              />

              <View style={styles.sortRow}>
                <Pressable
                  onPress={toggleSortOrder}
                  style={({ pressed }) => [
                    styles.sortToggleButton,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ordenar por ${sortLabel}`}>
                  <Ionicons
                    name={
                      sortOrder === 'RECIENTES'
                        ? 'arrow-down-circle-outline'
                        : 'arrow-up-circle-outline'
                    }
                    size={16}
                    color="#4B5563"
                  />
                  <Text style={styles.sortToggleText}>{sortLabel}</Text>
                </Pressable>
              </View>
            </View>

            {sortedSessions.length === 0 ? (
              <View style={styles.centerContainer}>
                <MaterialIcons name="event-busy" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  No hay sesiones para el filtro seleccionado
                </Text>
              </View>
            ) : (
              <FlatList
                style={styles.listContainer}
                data={sortedSessions}
                keyExtractor={item => String(item.id)}
                renderItem={renderSessionCard}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefetching || isManualRefreshing}
                    onRefresh={handleRefresh}
                  />
                }
                contentContainerStyle={styles.listContent}
                ListFooterComponent={<View style={styles.listFooterSpacing} />}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0891B2',
    flex: 1,
  },
  listContainer: {
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  listFooterSpacing: {
    height: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  filtersSection: {
    marginTop: 16,
    gap: 10,
  },
  filterListContent: {
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: '#CFFAFE',
    borderColor: '#06B6D4',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#0E7490',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sortToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortToggleText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  dateSubText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 28,
    marginTop: 2,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 28,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  equipmentTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  equipmentTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  equipmentTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
