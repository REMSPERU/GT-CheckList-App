import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { styles } from '../_panel-configuration/_styles';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { TableroElectricoResponse } from '@/types/api';



export default function EquipmentDetailsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // Retrieve panel data from navigation params inside component
  const params = useLocalSearchParams();
  
  let panel: TableroElectricoResponse | null = null;
  let detail: any = null;

  try {
    if (params.panel) {
      panel = JSON.parse(params.panel as string);
      detail = panel?.equipment_detail || {};
    }
  } catch (e) {
    console.error('Error parsing panel data', e);
  }
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
          <Text style={styles.equipmentLabel}>Equipo: {panel?.rotulo ?? ''}</Text>
        <Text style={styles.stepTitleStrong}>Resumen del Estado Actual</Text>

        <View style={{ marginTop: 16 }}>
          {panel && detail ? (
            <PanelDetailContent 
              data={{
                rotulo: panel.rotulo,
                tipo_tablero: panel.tipo || '',
                detalle_tecnico: detail.detalle_tecnico || {},
                itgs: detail.itgs || [],
                componentes: detail.componentes || [],
                condiciones_especiales: detail.condiciones_especiales || {}
              }} 
            />
          ) : (
            <Text>No se encontró información del detalle.</Text>
          )}
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
