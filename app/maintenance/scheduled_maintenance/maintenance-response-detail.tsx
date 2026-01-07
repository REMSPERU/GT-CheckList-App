import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import MaintenanceHeader from '@/components/maintenance-header';

export default function MaintenanceResponseDetailScreen() {
  const { maintenanceId } = useLocalSearchParams<{ maintenanceId: string }>();

  const {
    data: responseData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['maintenance-response', maintenanceId],
    queryFn: async () => {
      if (!maintenanceId) return null;

      const { data, error } = await supabase
        .from('maintenance_response')
        .select(
          `
          id,
          id_mantenimiento,
          user_created,
          detail_maintenance,
          created,
          users:user_created (
            first_name,
            last_name,
            email
          )
        `,
        )
        .eq('id_mantenimiento', maintenanceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!maintenanceId,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MaintenanceHeader
          title="Detalle de Mantenimiento"
          iconName="assignment"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Cargando detalles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!responseData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MaintenanceHeader
          title="Detalle de Mantenimiento"
          iconName="assignment"
        />
        <View style={styles.loadingContainer}>
          <Ionicons name="document-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            No se encontró el registro de mantenimiento
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const detail = responseData.detail_maintenance || {};
  const userData = (responseData as any).users;

  const renderPhotoGrid = (photos: any[], title: string) => {
    if (!photos || photos.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.emptyText}>Sin fotos</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {title} ({photos.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            {photos.map((photo: any, index: number) => (
              <Image
                key={photo.id || index}
                source={{ uri: photo.url || photo.uri }}
                style={styles.photo}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderChecklistItem = (key: string, value: boolean) => {
    const isOk = value === true;
    const label = key.replace(/_/g, ' ').toUpperCase();
    const measurements = detail.measurements?.[key];
    const observation = detail.itemObservations?.[key];

    return (
      <View
        key={key}
        style={[styles.checklistItem, !isOk && styles.checklistItemIssue]}>
        <View style={styles.checklistHeader}>
          <Text style={styles.checklistLabel}>{label}</Text>
          <View
            style={[
              styles.statusBadge,
              isOk ? styles.statusOk : styles.statusIssue,
            ]}>
            <Text style={styles.statusBadgeText}>{isOk ? 'OK' : 'OBS'}</Text>
          </View>
        </View>

        {measurements && (
          <View style={styles.measurementsRow}>
            {measurements.voltage && (
              <View style={styles.measurementChip}>
                <Ionicons name="flash" size={14} color="#F59E0B" />
                <Text style={styles.measurementText}>
                  {measurements.voltage} V
                </Text>
              </View>
            )}
            {measurements.amperage && (
              <View style={styles.measurementChip}>
                <MaterialIcons name="electric-bolt" size={14} color="#3B82F6" />
                <Text style={styles.measurementText}>
                  {measurements.amperage} A
                </Text>
              </View>
            )}
          </View>
        )}

        {!isOk && observation && (
          <View style={styles.observationBox}>
            <Text style={styles.observationLabel}>Observación:</Text>
            <Text style={styles.observationText}>
              {observation.note || 'Sin nota'}
            </Text>
            {observation.photoUrl && (
              <Image
                source={{ uri: observation.photoUrl }}
                style={styles.observationPhoto}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader
        title="Detalle de Mantenimiento"
        iconName="assignment"
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }>
        {/* Meta Info */}
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Ionicons name="person" size={18} color="#06B6D4" />
            <Text style={styles.metaLabel}>Técnico:</Text>
            <Text style={styles.metaValue}>
              {userData?.first_name || ''}{' '}
              {userData?.last_name || 'No especificado'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={18} color="#06B6D4" />
            <Text style={styles.metaLabel}>Fecha:</Text>
            <Text style={styles.metaValue}>
              {detail.completedAt
                ? new Date(detail.completedAt).toLocaleString()
                : new Date(responseData.created).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Pre Photos */}
        {renderPhotoGrid(
          detail.prePhotos?.filter((p: any) => p.category !== 'thermo'),
          'Fotos Previas (Visual)',
        )}

        {/* Thermo Photos */}
        {renderPhotoGrid(
          detail.prePhotos?.filter((p: any) => p.category === 'thermo'),
          'Fotos Termográficas',
        )}

        {/* Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verificación de Equipos</Text>
          {Object.keys(detail.checklist || {}).length === 0 ? (
            <Text style={styles.emptyText}>Sin items verificados</Text>
          ) : (
            Object.entries(detail.checklist || {}).map(([key, value]) =>
              renderChecklistItem(key, value as boolean),
            )
          )}
        </View>

        {/* General Observations */}
        {detail.observations && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Observaciones Generales</Text>
            <Text style={styles.generalObservation}>{detail.observations}</Text>
          </View>
        )}

        {/* Post Photos */}
        {renderPhotoGrid(detail.postPhotos, 'Fotos Finales')}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F7FA',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '600',
    flex: 1,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  checklistItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  checklistItemIssue: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    paddingLeft: 12,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOk: {
    backgroundColor: '#ECFDF5',
  },
  statusIssue: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#11181C',
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  measurementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  measurementText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'monospace',
  },
  observationBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  observationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 4,
  },
  observationText: {
    fontSize: 14,
    color: '#374151',
  },
  observationPhoto: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginTop: 8,
  },
  generalObservation: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
