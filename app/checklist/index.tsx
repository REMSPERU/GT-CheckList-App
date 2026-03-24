import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function EquipmentChecklistListScreen() {
  const router = useRouter();
  const { building: buildingParam, equipamento: equipamentoParam } =
    useLocalSearchParams();

  const [building, setBuilding] = useState<BuildingParam | null>(null);
  const [equipamento, setEquipamento] = useState<EquipamentoResponse | null>(
    null,
  );
  const [equipos, setEquipos] = useState<BaseEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const parsedBuilding = parseJsonParam<BuildingParam>(buildingParam);
    const parsedEquipamento =
      parseJsonParam<EquipamentoResponse>(equipamentoParam);

    if (parsedBuilding) {
      setBuilding(parsedBuilding);
    }

    if (parsedEquipamento) {
      setEquipamento(parsedEquipamento);
    }

    if (!parsedBuilding || !parsedEquipamento) {
      setIsLoading(false);
    }
  }, [buildingParam, equipamentoParam]);

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
        },
      });
    },
    [building?.name, equipamento, router],
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() => handlePressEquipment(item)}>
              <View style={styles.itemIconWrap}>
                <Ionicons name="checkmark-done" size={22} color="#0891B2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {item.codigo || 'Sin codigo'}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {item.ubicacion || 'Sin ubicacion'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
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
    top: 52,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
});
