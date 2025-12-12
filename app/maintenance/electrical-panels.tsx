import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';
import { useElectricalPanelsByPropertyQuery } from '@/hooks/use-electrical-panels-by-property-query';
import type { TableroElectricoResponse, EquipamentoResponse } from '@/types/api';

export default function ElectricalPanelsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);
  const [equipamento, setEquipamento] = useState<EquipamentoResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'autosoportado' | 'distribucion'>('autosoportado');

  useEffect(() => {
    if (params.building) {
      try {
        setBuilding(JSON.parse(params.building as string));
      } catch (e) {
        console.error('Error parsing building param:', e);
      }
    }
    if (params.equipamento) {
      try {
        setEquipamento(JSON.parse(params.equipamento as string));
      } catch (e) {
        console.error('Error parsing equipamento param:', e);
      }
    }
  }, [params.building, params.equipamento]);

  const panelTypeToSend = activeTab === 'autosoportado' ? 'Autosoportado' : 'Distribucion';
  console.log('Frontend: Sending panelType to hook:', panelTypeToSend);

  const {
    data: panelsData,
    isLoading,
    isError,
    error,
  } = useElectricalPanelsByPropertyQuery(
    building?.id,
    panelTypeToSend // Pasar el tipo de panel como filtro
  );

  const panels = panelsData || [];

  const handlePanelPress = (panel: TableroElectricoResponse) => {
    if (!panel.is_configured) {
      router.push({
        pathname: '/maintenance/panel-configuration',
        params: {
          panel: JSON.stringify(panel),
          building: building ? JSON.stringify(building) : '',
        },
      });
      return;
    }

    console.log('Panel seleccionado:', JSON.stringify(panel, null, 2));
    router.push({
        pathname: '/maintenance/_panel-configuration/index', // Ruta al panel configurado
        params: {
            panel: JSON.stringify(panel),
            building: building ? JSON.stringify(building) : '',
        },
    });
  };

  const filteredPanels = panels; // El filtro ya se aplica en el hook de React Query

  const renderPanel = (panel: TableroElectricoResponse) => (
    <TouchableOpacity
      key={panel.id}
      style={[
        styles.panelCard,
        !panel.is_configured && styles.panelCardDisabled
      ]}
      onPress={() => handlePanelPress(panel)}
      disabled={false} // Siempre habilitado, la lógica de navegación maneja el estado
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelName}>{panel.rotulo || panel.tipo}</Text>
        {!panel.is_configured && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#EF4444" />
          </View>
        )}
      </View>

      <Text style={styles.panelFloor}>{panel.ubicacion}</Text>

      <View style={styles.panelDetails}>
        <Text style={styles.detailLabel}>Código:</Text>
        <Text style={styles.detailValue}>{panel.codigo}</Text>
      </View>

      <View style={styles.panelDetails}>
        <Text style={styles.detailLabel}>Tipo:</Text>
        <Text style={styles.detailValue}>{panel.tipo}</Text>
      </View>

      {!panel.is_configured && (
        <View style={styles.notConfiguredBanner}>
          <Ionicons name="warning" size={14} color="#EF4444" />
          <Text style={styles.notConfiguredText}>
            Este equipo aún no está configurado.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <DefaultHeader
          title="Tableros eléctricos"
          searchPlaceholder="Buscar tableros"
        />

        {/* Building Info */}
        <View style={styles.buildingInfo}>
          <Text style={styles.buildingName}>
            {building ? building.name : 'Centro Empresarial Leuro'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'autosoportado' && styles.activeTab
            ]}
            onPress={() => setActiveTab('autosoportado')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'autosoportado' && styles.activeTabText
            ]}>
              Autosoportado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'distribucion' && styles.activeTab
            ]}
            onPress={() => setActiveTab('distribucion')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'distribucion' && styles.activeTabText
            ]}>
              Distribución
            </Text>
          </TouchableOpacity>
        </View>

        {/* Panels Grid */}
        <View style={styles.panelsContainer}>
          <View style={styles.panelsGrid}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Cargando tableros eléctricos...</Text>
              </View>
            ) : isError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error?.message || 'Error al cargar los tableros eléctricos'}</Text>
              </View>
            ) : panels.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No hay tableros eléctricos disponibles con este filtro.</Text>
              </View>
            ) : (
              panels.map(renderPanel)
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  buildingInfo: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#0891B2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  panelsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  panelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  panelCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  panelCardDisabled: {
    opacity: 0.7,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  panelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  warningContainer: {
    marginLeft: 8,
  },
  panelFloor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  panelDetails: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  notConfiguredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  notConfiguredText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 6,
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  activeNavItem: {
    // Estilo para el item activo
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#0891B2',
  },
});