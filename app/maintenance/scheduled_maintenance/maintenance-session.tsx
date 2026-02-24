import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
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

export default function MaintenanceSessionScreen() {
  const router = useRouter();
  const { propertyId, propertyName } = useLocalSearchParams<{
    propertyId: string;
    propertyName?: string;
  }>();

  const {
    data: sessions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useMaintenanceSessions(propertyId);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const getSessionStatus = (session: any) => {
    if (session.total > 0 && session.completed === session.total) {
      return { label: 'COMPLETADO', color: '#10B981', bgColor: '#D1FAE5' };
    }
    if (session.completed > 0 || session.inProgress > 0) {
      return { label: 'EN PROGRESO', color: '#06B6D4', bgColor: '#CFFAFE' };
    }
    return { label: 'NO INICIADO', color: '#6B7280', bgColor: '#F3F4F6' };
  };

  const getProgressPercentage = (session: any) => {
    if (!session.total || session.total === 0) return 0;
    return (session.completed / session.total) * 100;
  };

  const formatDate = (dateStr: string) => {
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
  };

  const getEquipmentTypeConfig = (type: string) => {
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
  };

  const handleSessionPress = (session: any) => {
    router.push({
      pathname: '/maintenance/scheduled_maintenance/equipment-maintenance-list',
      params: {
        propertyId,
        sessionId: session.id,
        sessionName: session.nombre,
        propertyName,
      },
    });
  };

  // Filter out fully completed sessions
  const pendingSessions = sessions.filter(
    (s: any) => s.total === 0 || s.completed < s.total,
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

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : pendingSessions.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="event-busy" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              No hay sesiones de mantenimiento pendientes
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }>
            {pendingSessions.map((session: any) => {
              const status = getSessionStatus(session);
              const progress = getProgressPercentage(session);
              const isComplete =
                session.total > 0 && session.completed === session.total;

              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.7}>
                  {/* Session Name */}
                  <View style={styles.cardHeader}>
                    <View style={styles.dateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#06B6D4"
                      />
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

                  {/* Equipment Types */}
                  {session.equipmentTypes &&
                    session.equipmentTypes.length > 0 && (
                      <View style={styles.equipmentTypesRow}>
                        {session.equipmentTypes.map(
                          (type: string, idx: number) => {
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
                          },
                        )}
                      </View>
                    )}

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
    textAlign: 'center',
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
