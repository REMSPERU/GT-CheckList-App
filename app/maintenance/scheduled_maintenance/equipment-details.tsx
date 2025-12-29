import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { styles } from '../_panel-configuration/_styles';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';

// Mock data structured to match PanelDetailContent props
const MOCK_PANEL_DATA = {
  rotulo: 'Tablero Eléctrico Principal',
  tipo_tablero: 'Distribución',
  detalle_tecnico: {
    fases: 'Trifásico',
    voltaje: '220',
    tipo_tablero: 'Distribución'
  },
  itgs: [
    {
      id: 'IT-G1',
      suministra: 'Interruptor General 1',
      prefijo: 'C',
      itms: [
        {
          id: 'C1',
          amperaje: 20,
          fases: 'R-S',
          tipo_cable: 'libre_halogeno',
          diametro_cable: '4',
          suministra: 'Iluminación Hall',
          diferencial: {
            existe: true,
            amperaje: 25,
            fases: 'mono_2w',
            tipo_cable: 'libre_halogeno',
            diametro_cable: '4'
          }
        },
        {
          id: 'C2',
          amperaje: 16,
          fases: 'R-T',
          tipo_cable: 'libre_halogeno',
          diametro_cable: '2.5',
          suministra: 'Tomacorrientes Sala',
        }
      ]
    },
    {
      id: 'IT-G2',
      suministra: 'Interruptor General 2',
      prefijo: 'L',
      itms: [
        {
          id: 'L1',
          amperaje: 32,
          fases: 'R-S-T',
          tipo_cable: 'no_libre_halogeno',
          diametro_cable: '6',
          suministra: 'Aire Acondicionado',
        }
      ]
    }
  ],
  componentes: [
    {
      tipo: 'contactores',
      items: [
        { codigo: 'K1', suministra: 'Bomba de Agua 1' },
      ]
    },
    {
      tipo: 'timers',
      items: [
        { codigo: 'T1', suministra: 'Control Luces Externas' }
      ]
    }
  ],
  condiciones_especiales: {
    mandil_proteccion: true,
    puerta_mandil_aterrados: true,
    barra_tierra: true,
    terminales_electricos: false,
    mangas_termo_contraibles: false,
    diagrama_unifilar_directorio: true
  }
};

export default function EquipmentDetailsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use endpoint to fetch specific equipment details
  // For now using the mock data above

  const handleStartMaintenance = () => {
    setIsLoading(true);
    // Simulate loading for 1s then navigate
    setTimeout(() => {
      setIsLoading(false);
      router.push("/maintenance/scheduled_maintenance/pre-maintenance-photos");
    }, 1000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
      {/* Custom Header matching the previous screens */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{
          backgroundColor: '#06B6D4',
          padding: 6,
          borderRadius: 8,
          marginRight: 10,
        }}>
          <MaterialIcons name="home-repair-service" size={20} color="white" />
        </View>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: Colors.light.text,
        }}>Detalles del Equipo</Text>
      </View>

      <ScrollView style={styles.contentWrapper} showsVerticalScrollIndicator={false}>
        <Text style={styles.equipmentLabel}>Equipo: {MOCK_PANEL_DATA.rotulo}</Text>
        <Text style={styles.stepTitleStrong}>Resumen del Estado Actual</Text>

        <View style={{ marginTop: 16 }}>
          <PanelDetailContent data={MOCK_PANEL_DATA} />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 10, marginBottom: 40, backgroundColor: '#06B6D4' }]}
          onPress={handleStartMaintenance}
          disabled={isLoading}
        >
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Cargando...' : 'Iniciar mantenimiento'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
