import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FlatList,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  Pressable,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MaintenanceCard from '@/components/maintenance-card';
import type { EquipamentoResponse } from '@/types/api';
// import { useEquipamentosByPropertyQuery } from '@/hooks/use-equipments-by-property-query';
import { DatabaseService } from '@/services/database';
import { syncService } from '@/services/sync';

interface BuildingParam {
  id: string;
  name: string;
  address?: string;
  image_url?: string;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseJsonParam<T>(value: string | string[] | undefined): T | null {
  const rawValue = getSingleParam(value);
  if (typeof rawValue !== 'string') return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

const log = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export default function SelectDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const flowType = params.type as string | undefined;
  const [building, setBuilding] = useState<BuildingParam | null>(null);

  useEffect(() => {
    const buildingId = getSingleParam(params.buildingId);
    const buildingName = getSingleParam(params.buildingName);
    const buildingAddress = getSingleParam(params.buildingAddress);
    const buildingImageUrl = getSingleParam(params.buildingImageUrl);

    if (buildingId && buildingName) {
      const parsedBuilding: BuildingParam = {
        id: buildingId,
        name: buildingName,
        address: buildingAddress,
        image_url: buildingImageUrl,
      };
      setBuilding(parsedBuilding);
      log('SelectDevice: Building ID:', parsedBuilding.id);
      return;
    }

    const legacyBuilding = parseJsonParam<BuildingParam>(params.building);
    if (legacyBuilding) {
      setBuilding(legacyBuilding);
      log('SelectDevice: Parsed legacy building ID:', legacyBuilding.id);
    }
  }, [
    params.building,
    params.buildingAddress,
    params.buildingId,
    params.buildingImageUrl,
    params.buildingName,
  ]);

  const [equipamentos, setEquipamentos] = useState<EquipamentoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!building?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await DatabaseService.getEquipamentosByProperty(building.id);
      setEquipamentos(data as EquipamentoResponse[]);
    } catch (err) {
      console.error('Error loading equipments:', err);
      setError('Error al cargar equipamientos locales');
    }

    setIsLoading(false);
  }, [building?.id]);

  useEffect(() => {
    if (building?.id) {
      loadData();
    }
  }, [building, loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Trigger Sync
      await syncService.pullData();
      // 2. Reload local data
      await loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo sincronizar con el servidor.');
      console.error(e);
    }

    setIsRefreshing(false);
  }, [loadData]);

  const handleEquipamentoPress = useCallback(
    (equipamento: EquipamentoResponse) => {
      log('Selected equipamento:', equipamento);
      log('Building:', building);

      if (flowType === 'checklist') {
        router.push({
          pathname: '/checklist',
          params: {
            buildingId: building?.id ?? '',
            buildingName: building?.name ?? '',
            buildingAddress: building?.address ?? '',
            buildingImageUrl: building?.image_url ?? '',
            equipamentoId: equipamento.id,
            equipamentoNombre: equipamento.nombre,
            equipamentoFrecuencia: equipamento.frecuencia ?? 'MENSUAL',
            equipamentoAbreviatura: equipamento.abreviatura,
          },
        });
        return;
      }

      // Route based on equipment abbreviation from DB
      switch (equipamento.abreviatura) {
        case 'TBELEC':
          // Tablero electrico
          router.push({
            pathname: '/maintenance/electrical-panels',
            params: {
              buildingId: building?.id ?? '',
              buildingName: building?.name ?? '',
              buildingAddress: building?.address ?? '',
              buildingImageUrl: building?.image_url ?? '',
              equipamentoId: equipamento.id,
              equipamentoNombre: equipamento.nombre,
              equipamentoFrecuencia: equipamento.frecuencia ?? 'MENSUAL',
              equipamentoAbreviatura: equipamento.abreviatura,
            },
          });
          break;
        case 'LUZ':
          // Luces de Emergencia
          router.push({
            pathname: '/maintenance/emergency-lights',
            params: {
              buildingId: building?.id ?? '',
              buildingName: building?.name ?? '',
              buildingAddress: building?.address ?? '',
              buildingImageUrl: building?.image_url ?? '',
              equipamentoId: equipamento.id,
              equipamentoNombre: equipamento.nombre,
              equipamentoFrecuencia: equipamento.frecuencia ?? 'MENSUAL',
              equipamentoAbreviatura: equipamento.abreviatura,
            },
          });
          break;
        case 'PAT':
          // Pozo a Tierra
          router.push({
            pathname: '/maintenance/grounding-wells',
            params: {
              buildingId: building?.id ?? '',
              buildingName: building?.name ?? '',
              buildingAddress: building?.address ?? '',
              buildingImageUrl: building?.image_url ?? '',
              equipamentoId: equipamento.id,
              equipamentoNombre: equipamento.nombre,
              equipamentoFrecuencia: equipamento.frecuencia ?? 'MENSUAL',
              equipamentoAbreviatura: equipamento.abreviatura,
            },
          });
          break;
        default:
          // Fallback for other equipment types
          log('No route configured for:', equipamento.abreviatura);
          break;
      }
    },
    [building, flowType, router],
  );

  const handleChecklistSchedulePress = useCallback(
    (equipamento: EquipamentoResponse) => {
      router.push({
        pathname: '/checklist/schedule',
        params: {
          buildingId: building?.id ?? '',
          buildingName: building?.name ?? '',
          equipamentoId: equipamento.id,
          equipamentoNombre: equipamento.nombre,
        },
      });
    },
    [building?.id, building?.name, router],
  );

  const getIconForEquipamento = useCallback((abreviatura: string) => {
    // Map equipment abbreviations to icons
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      TBELEC: 'stats-chart-outline', // Tablero electrico
      LUZ: 'flashlight-outline', // Luces de Emergencia
      PT: 'construct-outline',
      PAT: 'filter-outline', // Pozo a Tierra
      ASC: 'arrow-up-outline',
    };
    return iconMap[abreviatura] || 'cube-outline';
  }, []);

  const renderEquipamentoItem = useCallback<
    ListRenderItem<EquipamentoResponse>
  >(
    ({ item }) => {
      if (flowType === 'checklist') {
        return (
          <Pressable
            style={({ pressed }) => [
              styles.checklistCard,
              pressed && styles.checklistCardPressed,
            ]}
            onPress={() => handleEquipamentoPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir checklist de ${item.nombre}`}
            accessibilityHint="Navega a la lista de equipos para registrar checklist">
            <View style={styles.checklistCardContent}>
              <View style={styles.checklistIconWrap}>
                <Ionicons
                  name={getIconForEquipamento(item.abreviatura)}
                  size={22}
                  color="#06B6D4"
                />
              </View>
              <Text style={styles.checklistCardTitle}>{item.nombre}</Text>
            </View>

            <View style={styles.checklistActions}>
              <Pressable
                onPress={event => {
                  event.stopPropagation();
                  handleChecklistSchedulePress(item);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Programar checklist de tipo ${item.nombre}`}>
                <Ionicons name="calendar-outline" size={20} color="#0891B2" />
              </Pressable>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>
        );
      }

      return (
        <MaintenanceCard
          icon={getIconForEquipamento(item.abreviatura)}
          title={item.nombre}
          onPress={() => handleEquipamentoPress(item)}
          accessibilityLabel={`Abrir mantenimiento de ${item.nombre}`}
          accessibilityHint="Navega al flujo de mantenimiento del equipo"
        />
      );
    },
    [
      flowType,
      getIconForEquipamento,
      handleChecklistSchedulePress,
      handleEquipamentoPress,
    ],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with Building Image */}
      <View style={styles.headerContainer}>
        {building?.image_url ? (
          <Image
            source={{ uri: building.image_url }}
            style={styles.headerImage}
            contentFit="cover"
            cachePolicy="disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={300}
          />
        ) : (
          <View style={styles.headerPlaceholder}>
            <Ionicons name="business" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <View style={styles.headerOverlay} />
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
            accessibilityHint="Vuelve a la pantalla anterior">
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={2}
              ellipsizeMode="tail">
              {building?.name || 'Seleccionar Equipo'}
            </Text>
            {building?.address && (
              <Text
                style={styles.headerSubtitle}
                numberOfLines={2}
                ellipsizeMode="tail">
                {building.address}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando localmente...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={equipamentos}
          keyExtractor={item => String(item.id)}
          renderItem={renderEquipamentoItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listWrapper,
            equipamentos.length === 0 && styles.listWrapperEmpty,
          ]}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                No hay equipamientos disponibles para este inmueble
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
  // Header styles
  headerContainer: {
    minHeight: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  headerContent: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitleContainer: {
    marginTop: 'auto',
    paddingLeft: 56,
    paddingRight: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Content styles
  listWrapper: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  listWrapperEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
  checklistCard: {
    minHeight: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#171a1f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    gap: 10,
  },
  checklistCardPressed: {
    opacity: 0.75,
  },
  checklistCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checklistIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checklistCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  checklistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
