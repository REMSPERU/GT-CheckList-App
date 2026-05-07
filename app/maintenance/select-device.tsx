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
import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MaintenanceCard from '@/components/maintenance-card';
import type {
  EquipamentoResponse,
  SistemaChecklistResponse,
} from '@/types/api';
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

function getIconForEquipamento(abreviatura: string) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    TBELEC: 'stats-chart-outline',
    LUZ: 'flashlight-outline',
    PT: 'construct-outline',
    PAT: 'filter-outline',
    ASC: 'arrow-up-outline',
    CHAG: 'water-outline',
    CHAI: 'snow-outline',
    TOE: 'sync-circle-outline',
  };
  return iconMap[abreviatura] || 'cube-outline';
}

interface ChecklistSystemCardProps {
  item: SistemaChecklistResponse;
  isExpanded: boolean;
  onToggle: (systemId: string) => void;
  onPressEquipamento: (equipamento: EquipamentoResponse) => void;
  onSchedulePress: (equipamento: EquipamentoResponse) => void;
}

const ChecklistSystemCard = memo(function ChecklistSystemCard({
  item,
  isExpanded,
  onToggle,
  onPressEquipamento,
  onSchedulePress,
}: ChecklistSystemCardProps) {
  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <View style={[styles.systemCard, isExpanded && styles.systemCardExpanded]}>
      <Pressable
        style={({ pressed }) => [
          styles.systemHeader,
          pressed && styles.checklistCardPressed,
        ]}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`Abrir sistema ${item.nombre}`}
        accessibilityHint="Despliega los equipamientos del sistema">
        <View style={styles.systemIconWrap}>
          <Ionicons name="layers-outline" size={22} color="#0891B2" />
        </View>
        <View style={styles.systemHeaderBody}>
          <Text style={styles.systemTitle}>{item.nombre}</Text>
          <Text style={styles.systemSubtitle}>
            {item.equipamentos.length} equipamentos · {item.equipos_count}{' '}
            equipos activos
          </Text>
        </View>
        <View style={styles.systemChevronWrap}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#64748B"
          />
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.equipmentPanel}>
          {item.equipamentos.map(equipamento => (
            <ChecklistEquipamentoRow
              key={equipamento.id}
              item={equipamento}
              onPress={onPressEquipamento}
              onSchedulePress={onSchedulePress}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

interface ChecklistEquipamentoRowProps {
  item: EquipamentoResponse;
  onPress: (equipamento: EquipamentoResponse) => void;
  onSchedulePress: (equipamento: EquipamentoResponse) => void;
}

const ChecklistEquipamentoRow = memo(function ChecklistEquipamentoRow({
  item,
  onPress,
  onSchedulePress,
}: ChecklistEquipamentoRowProps) {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleSchedulePress = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      onSchedulePress(item);
    },
    [item, onSchedulePress],
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.equipmentRow,
        pressed && styles.checklistCardPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir checklist de ${item.nombre}`}>
      <View style={styles.equipmentIconWrap}>
        <Ionicons
          name={getIconForEquipamento(item.abreviatura)}
          size={20}
          color="#0F766E"
        />
      </View>
      <View style={styles.equipmentRowBody}>
        <Text style={styles.equipmentRowTitle}>{item.nombre}</Text>
        <Text style={styles.equipmentRowSubtitle}>
          {(item.frecuencia || 'MENSUAL').toUpperCase()} ·{' '}
          {item.equipos_count ?? 0} equipos
        </Text>
      </View>
      <View style={styles.checklistActions}>
        <Pressable
          style={styles.scheduleButton}
          onPress={handleSchedulePress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Programar checklist de tipo ${item.nombre}`}>
          <Ionicons name="calendar-outline" size={18} color="#0891B2" />
        </Pressable>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </View>
    </Pressable>
  );
});

export default function SelectDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const flowType = params.type as string | undefined;
  const [building, setBuilding] = useState<BuildingParam | null>(null);
  const [paramsResolved, setParamsResolved] = useState(false);
  const lastLoggedBuildingIdRef = useRef<string | null>(null);

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
      if (lastLoggedBuildingIdRef.current !== parsedBuilding.id) {
        log('SelectDevice: Building ID:', parsedBuilding.id);
        lastLoggedBuildingIdRef.current = parsedBuilding.id;
      }
      setParamsResolved(true);
      return;
    }

    const legacyBuilding = parseJsonParam<BuildingParam>(params.building);
    if (legacyBuilding) {
      setBuilding(legacyBuilding);
      if (lastLoggedBuildingIdRef.current !== legacyBuilding.id) {
        log('SelectDevice: Parsed legacy building ID:', legacyBuilding.id);
        lastLoggedBuildingIdRef.current = legacyBuilding.id;
      }
      setParamsResolved(true);
      return;
    }

    setBuilding(null);
    lastLoggedBuildingIdRef.current = null;
    setParamsResolved(true);
  }, [
    params.building,
    params.buildingAddress,
    params.buildingId,
    params.buildingImageUrl,
    params.buildingName,
  ]);

  const [equipamentos, setEquipamentos] = useState<EquipamentoResponse[]>([]);
  const [checklistSystems, setChecklistSystems] = useState<
    SistemaChecklistResponse[]
  >([]);
  const [expandedSystemId, setExpandedSystemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!building?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (flowType === 'checklist') {
        const data = await DatabaseService.getChecklistSystemsByProperty(
          building.id,
        );
        const systems = data as SistemaChecklistResponse[];
        setChecklistSystems(systems);
        setEquipamentos([]);
        setExpandedSystemId(current => current ?? systems[0]?.id ?? null);
      } else {
        const data = await DatabaseService.getEquipamentosByProperty(
          building.id,
        );
        setEquipamentos(data as EquipamentoResponse[]);
        setChecklistSystems([]);
        setExpandedSystemId(null);
      }
    } catch (err) {
      console.error('Error loading equipments:', err);
      setError('Error al cargar equipamientos locales');
    }

    setIsLoading(false);
  }, [building?.id, flowType]);

  useEffect(() => {
    if (!paramsResolved) return;

    if (building?.id) {
      loadData();
      return;
    }

    setEquipamentos([]);
    setChecklistSystems([]);
    setExpandedSystemId(null);
    setError('No se pudo identificar el inmueble seleccionado.');
    setIsLoading(false);
  }, [building?.id, loadData, paramsResolved]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Trigger Sync
      await syncService.triggerSync('select-device-refresh', { force: true });
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

  const handleToggleSystem = useCallback((systemId: string) => {
    setExpandedSystemId(current => (current === systemId ? null : systemId));
  }, []);

  const renderChecklistSystemItem = useCallback<
    ListRenderItem<SistemaChecklistResponse>
  >(
    ({ item }) => (
      <ChecklistSystemCard
        item={item}
        isExpanded={expandedSystemId === item.id}
        onToggle={handleToggleSystem}
        onPressEquipamento={handleEquipamentoPress}
        onSchedulePress={handleChecklistSchedulePress}
      />
    ),
    [
      expandedSystemId,
      handleChecklistSchedulePress,
      handleEquipamentoPress,
      handleToggleSystem,
    ],
  );

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
    [flowType, handleChecklistSchedulePress, handleEquipamentoPress],
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

      {!paramsResolved || (isLoading && !isRefreshing) ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando localmente...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : flowType === 'checklist' ? (
        <FlatList
          data={checklistSystems}
          keyExtractor={item => String(item.id)}
          renderItem={renderChecklistSystemItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listWrapper,
            styles.checklistListWrapper,
            checklistSystems.length === 0 && styles.listWrapperEmpty,
          ]}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                No hay sistemas con equipos activos para este inmueble.
              </Text>
            </View>
          }
        />
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
  checklistListWrapper: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 12,
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
  systemCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  systemCardExpanded: {
    borderColor: '#CBD5E1',
  },
  systemHeader: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  systemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFFAFE',
  },
  systemHeaderBody: {
    flex: 1,
  },
  systemTitle: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '800',
  },
  systemSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  systemChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentPanel: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 8,
    gap: 7,
  },
  equipmentRow: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  equipmentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentRowBody: {
    flex: 1,
  },
  equipmentRowTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
  },
  equipmentRowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  scheduleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
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
