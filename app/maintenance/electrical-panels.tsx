import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';

interface ElectricalPanel {
  id: string;
  name: string;
  floor: string;
  label?: string;
  reference?: string;
  isConfigured: boolean;
}

export default function ElectricalPanelsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'autosoportado' | 'distribucion'>('autosoportado');

  // Datos de ejemplo basados en la imagen
  const [panels] = useState<ElectricalPanel[]>([
    {
      id: 'LEU-TBELEC-001',
      name: 'LEU-TBELEC-001',
      floor: 'Piso 2',
      label: '',
      reference: '',
      isConfigured: true
    },
    {
      id: 'LEU-TBELEC-002',
      name: 'LEU-TBELEC-002',
      floor: 'Piso 5',
      label: '',
      reference: '',
      isConfigured: false
    },
    {
      id: 'FP-003',
      name: 'FP-003',
      floor: 'Piso 2',
      label: '',
      reference: '',
      isConfigured: true
    },
    {
      id: 'FP-004',
      name: 'FP-004',
      floor: 'Piso 5',
      label: '',
      reference: '',
      isConfigured: false
    }
  ]);

  useEffect(() => {
    if (params.building) {
      try {
        setBuilding(JSON.parse(params.building as string));
      } catch {}
    }
  }, [params.building]);

  const handlePanelPress = (panel: ElectricalPanel) => {
    if (!panel.isConfigured) {
      Alert.alert(
        'Equipo no configurado',
        'Este equipo aún no está configurado.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('Panel seleccionado:', panel);
    // Aquí puedes navegar a la siguiente pantalla
  };

  const filteredPanels = panels.filter(panel => {
    if (activeTab === 'autosoportado') {
      return panel.id.includes('LEU-TBELEC') || panel.id.includes('FP');
    }
    return false; // Por ahora solo mostramos en autosoportado
  });

  const renderPanel = (panel: ElectricalPanel) => (
    <TouchableOpacity
      key={panel.id}
      style={[
        styles.panelCard,
        !panel.isConfigured && styles.panelCardDisabled
      ]}
      onPress={() => handlePanelPress(panel)}
      disabled={!panel.isConfigured}
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelName}>{panel.name}</Text>
        {!panel.isConfigured && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#EF4444" />
          </View>
        )}
      </View>
      
      <Text style={styles.panelFloor}>{panel.floor}</Text>
      
      <View style={styles.panelDetails}>
        <Text style={styles.detailLabel}>Rótulo:</Text>
        <Text style={styles.detailValue}>{panel.label}</Text>
      </View>
      
      <View style={styles.panelDetails}>
        <Text style={styles.detailLabel}>Referencia:</Text>
        <Text style={styles.detailValue}>{panel.reference}</Text>
      </View>

      {!panel.isConfigured && (
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
            {filteredPanels.map(renderPanel)}
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