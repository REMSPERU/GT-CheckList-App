import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { styles } from '../electrical-panels/_config-steps/_styles';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { useElectricalPanelDetail } from '@/hooks/use-electrical-panel-detail';

export default function EquipmentDetailsScreen() {
  const router = useRouter();
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const params = useLocalSearchParams<{
    maintenanceId: string;
    panelId?: string;
    equipmentType?: string;
  }>();

  // Retrieve the ID. Supporting both maintenanceId (if useful later) and panelId directly.
  // For this refactor, we expect 'panelId' to be passed.
  const panelId = params.panelId;
  const equipmentType = params.equipmentType;

  const {
    data: panel,
    isLoading,
    isError,
  } = useElectricalPanelDetail(panelId || '');
  const detail = panel?.equipment_detail;

  const handleStartMaintenance = () => {
    setIsMaintenanceLoading(true);
    // Navigate to execution router which will redirect based on equipment type
    setTimeout(() => {
      setIsMaintenanceLoading(false);
      router.push({
        pathname: '/maintenance/execution',
        params: {
          panelId: panelId,
          maintenanceId: params.maintenanceId,
          equipmentType: equipmentType,
        },
      });
    }, 1000);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={{ marginTop: 10, color: Colors.light.text }}>
          Cargando información del equipo...
        </Text>
      </View>
    );
  }

  if (isError || !panel) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            backgroundColor: '#fff',
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 10 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: Colors.light.text }}>
            {isError
              ? 'Error al cargar la información.'
              : 'No se encontró el equipo.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
      {/* Custom Header matching the previous screens */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          backgroundColor: '#fff',
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View
          style={{
            backgroundColor: '#06B6D4',
            padding: 6,
            borderRadius: 8,
            marginRight: 10,
          }}>
          <MaterialIcons name="home-repair-service" size={20} color="white" />
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.light.text,
          }}>
          Detalles del Equipo
        </Text>
      </View>

      <ScrollView
        style={styles.contentWrapper}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.equipmentLabel}>
          Equipo: {detail?.rotulo || ''}
        </Text>
        <Text style={styles.stepTitleStrong}>Resumen del Estado Actual</Text>

        <View style={{ marginTop: 16 }}>
          {detail ? (
            <PanelDetailContent
              data={{
                rotulo: detail.rotulo || '',
                tipo_tablero: detail.tipo_tablero || '',
                detalle_tecnico: detail.detalle_tecnico,
                itgs: detail.itgs || [],
                componentes: detail.componentes || [],
                condiciones_especiales: detail.condiciones_especiales,
              }}
            />
          ) : (
            <Text>No se encontró información del detalle.</Text>
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View
        style={{
          padding: 20,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#fff',
        }}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: '#06B6D4' }]}
          onPress={handleStartMaintenance}
          disabled={isMaintenanceLoading}>
          <Text style={styles.primaryBtnText}>
            {isMaintenanceLoading ? 'Cargando...' : 'Iniciar mantenimiento'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
