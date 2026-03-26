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

interface EquipmentListItemProps {
  item: BaseEquipment;
  onPress: (item: BaseEquipment) => void;
  onSchedulePress: (item: BaseEquipment) => void;
}

const EquipmentListItem = React.memo(function EquipmentListItem({
  item,
  onPress,
  onSchedulePress,
}: EquipmentListItemProps) {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleSchedulePress = useCallback(() => {
    onSchedulePress(item);
  }, [item, onSchedulePress]);

  const locationText = [item.ubicacion, item.detalle_ubicacion]
    .filter(Boolean)
    .join(' - ');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        pressed && styles.itemCardPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Equipo ${item.codigo || 'sin codigo'}`}>
      <View style={styles.itemIconWrap}>
        <Ionicons name="checkmark-done" size={22} color="#0891B2" />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{item.codigo || 'Sin codigo'}</Text>
        <Text style={styles.itemSubtitle}>
          {locationText || 'Sin ubicacion'}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <Pressable
          onPress={event => {
            event.stopPropagation();
            handleSchedulePress();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Programar checklist de ${item.codigo || 'equipo'}`}>
          <Ionicons name="calendar-outline" size={20} color="#0EA5E9" />
        </Pressable>
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
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!building?.id || !equipamento?.id) {
      setIsLoading(false);
    }
  }, [building?.id, equipamento?.id]);

  const loadData = useCallback(async () => {
    if (!building?.id || !equipamento?.id) return;

    setIsLoading(true);
    try {
      const data = await DatabaseService.getEquipmentByProperty(building.id, {
        equipamentoId: equipamento.id,
      });
      setEquipos(data as BaseEquipment[]);
    } catch (error) {
      console.error('Error loading checklist equipment list:', error);
      setEquipos([]);
    } finally {
      setIsLoading(false);
    }
  }, [building?.id, equipamento?.id]);

  useEffect(() => {
    if (building?.id && equipamento?.id) {
      loadData();
    }
  }, [building?.id, equipamento?.id, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncService.pullData();
      await loadData();
    } catch (error) {
      console.error('Checklist list refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const frequencyLabel = useMemo(
    () => (equipamento?.frecuencia || 'MENSUAL').toUpperCase(),
    [equipamento?.frecuencia],
  );

  const handlePressEquipment = useCallback(
    (equipo: BaseEquipment) => {
      if (!equipamento) return;

      router.push({
        pathname: '/checklist/form',
        params: {
          buildingName: building?.name || '',
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
          frecuencia: equipamento.frecuencia || 'MENSUAL',
          equipoId: equipo.id,
          equipoCodigo: equipo.codigo,
          equipoUbicacion: equipo.ubicacion,
          equipoDetalleUbicacion: equipo.detalle_ubicacion,
        },
      });
    },
    [building?.name, equipamento, router],
  );

  const handleScheduleEquipment = useCallback(
    (equipo: BaseEquipment) => {
      if (!equipamento) return;

      router.push({
        pathname: '/checklist/schedule',
        params: {
          buildingName: building?.name || '',
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
          equipoId: equipo.id,
          equipoCodigo: equipo.codigo,
        },
      });
    },
    [building?.name, equipamento, router],
  );

  const renderEquipmentItem = useCallback(
    ({ item }: { item: BaseEquipment }) => (
      <EquipmentListItem
        item={item}
        onPress={handlePressEquipment}
        onSchedulePress={handleScheduleEquipment}
      />
    ),
    [handlePressEquipment, handleScheduleEquipment],
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

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0891B2" />
        </View>
      ) : (
        <FlatList
          data={equipos}
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
                No hay equipos para este tipo.
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
  itemCardPressed: {
    opacity: 0.8,
  },
  itemBody: {
    flex: 1,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
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
});
