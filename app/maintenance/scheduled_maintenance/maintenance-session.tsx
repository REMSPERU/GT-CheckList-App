import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceByProperty } from '@/hooks/use-maintenance';
import { MaintenanceStatusEnum } from '@/types/api';

interface MaintenanceSession {
  date: string;
  displayDate: string;
  total: number;
  completed: number;
  inProgress: number;
  maintenances: any[];
  codigo?: string;
  type?: string;
  equipmentType?: string;
}

export default function MaintenanceSessionScreen() {
  const router = useRouter();
  const { propertyId, propertyName } = useLocalSearchParams<{
    propertyId: string;
    propertyName?: string;
  }>();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Fetch Data
  const {
    data: maintenanceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceByProperty(propertyId);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Group maintenances by date
  const sessions = useMemo(() => {
    const grouped: Record<string, MaintenanceSession> = {};

    maintenanceData.forEach((item: any) => {
      const dateKey = item.dia_programado;
      if (!dateKey) return;

      if (!grouped[dateKey]) {
        // Parse date - handle both "YYYY-MM-DD" and ISO formats
        let dateObj: Date;
        if (typeof dateKey === 'string' && dateKey.includes('T')) {
          // ISO format with time
          dateObj = new Date(dateKey);
        } else {
          // Date only format - add time to avoid timezone issues
          dateObj = new Date(dateKey + 'T12:00:00');
        }

        // Check if date is valid
        let displayDate: string;
        if (isNaN(dateObj.getTime())) {
          displayDate = dateKey; // fallback to raw string
        } else {
          const formatted = dateObj.toLocaleDateString('es-PE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          displayDate = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        grouped[dateKey] = {
          date: dateKey,
          displayDate,
          total: 0,
          completed: 0,
          inProgress: 0,
          maintenances: [],
          codigo: item.codigo, // Extract codigo from first maintenance
          type: item.tipo_mantenimiento || 'Preventivo', // Extract type
          equipmentType: item.equipos?.equipamentos?.nombre || 'Desconocido', // Extract equipment type
        };
      }

      grouped[dateKey].total++;
      grouped[dateKey].maintenances.push(item);

      if (item.estatus === MaintenanceStatusEnum.FINALIZADO) {
        grouped[dateKey].completed++;
      } else if (item.estatus === MaintenanceStatusEnum.EN_PROGRESO) {
        grouped[dateKey].inProgress++;
      }
    });

    // Sort by date ascending
    return Object.values(grouped).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [maintenanceData]);

  const getSessionStatus = (session: MaintenanceSession) => {
    if (session.completed === session.total) {
      return { label: 'COMPLETADO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    if (session.completed > 0 || session.inProgress > 0) {
      return { label: 'EN PROGRESO', color: '#06B6D4', bgColor: '#CFFAFE' };
    }
    return { label: 'NO INICIADO', color: '#6B7280', bgColor: '#F3F4F6' };
  };

  const getProgressPercentage = (session: MaintenanceSession) => {
    if (session.total === 0) return 0;
    return (session.completed / session.total) * 100;
  };

  const availableEquipmentTypes = useMemo(() => {
    const types = new Set<string>();
    maintenanceData.forEach((item: any) => {
      if (item.equipos?.equipamentos?.nombre) {
        types.add(item.equipos.equipamentos.nombre);
      }
    });
    return ['Todos', ...Array.from(types)];
  }, [maintenanceData]);

  const filteredSessions = useMemo(() => {
    if (!selectedType) return sessions;
    return sessions.filter(s => s.equipmentType === selectedType);
  }, [sessions, selectedType]);

  const handleSessionPress = (session: MaintenanceSession) => {
    router.push({
      pathname: '/maintenance/scheduled_maintenance/equipment-maintenance-list',
      params: {
        propertyId,
        scheduledDate: session.date,
        propertyName,
      },
    });
  };

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

        {/* Filters */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContentContainer}>
            {availableEquipmentTypes.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  (type === 'Todos' && !selectedType) || selectedType === type
                    ? styles.filterChipActive
                    : null,
                ]}
                onPress={() => setSelectedType(type === 'Todos' ? null : type)}>
                <Text
                  style={[
                    styles.filterChipText,
                    (type === 'Todos' && !selectedType) || selectedType === type
                      ? styles.filterChipTextActive
                      : null,
                  ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="event-busy" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              No hay mantenimientos programados
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }>
            {filteredSessions.map(session => {
              const status = getSessionStatus(session);
              const progress = getProgressPercentage(session);
              const isComplete = session.completed === session.total;

              return (
                <TouchableOpacity
                  key={session.date}
                  style={styles.sessionCard}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.7}>
                  {/* Card Header & Info */}
                  <View style={styles.cardHeader}>
                    <View style={styles.dateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#06B6D4"
                      />
                      <Text style={styles.dateText}>{session.displayDate}</Text>
                    </View>

                    {session.codigo && (
                      <Text style={styles.codigoMainText}>
                        {session.codigo}
                      </Text>
                    )}

                    <View style={styles.badgesRow}>
                      {session.type && (
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeText}>{session.type}</Text>
                        </View>
                      )}
                      {session.equipmentType && (
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: '#E0E7FF' },
                          ]}>
                          <Text style={[styles.typeText, { color: '#3730A3' }]}>
                            {session.equipmentType}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Progress Bar */}
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

                  {/* Status and Arrow */}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.bgColor },
                      ]}>
                      <Text
                        style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                    {!isComplete && (
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#9CA3AF"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
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
  filterContainer: {
    marginTop: 16,
  },
  filterContentContainer: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  filterChipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0891B2',
    flex: 1,
  },
  listContainer: {
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
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
  cardHeader: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937', // Replaced Colors.light.text with hex code since Colors was unused warning
  },
  codigoMainText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 28, // Indent to align with text in dateRow
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 28,
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
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
});
