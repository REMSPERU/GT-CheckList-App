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
import { styles } from './_panel-configuration/_styles';

// Mock data for the equipment details (reusing the shape expected by ReviewStep logic)
const MOCK_EQUIPMENT_DETAILS = {
  codigo: 'LEU-TBELEC-001',
  name: 'Tablero Eléctrico Principal',
  values: {
    panelType: 'Distribución',
    voltage: '220',
    phase: 'Trifásico',
    itgDescriptions: ['Interruptor General 1', 'Interruptor General 2'],
    itgCircuits: [
      { cnPrefix: 'C', circuitsCount: 12 },
      { cnPrefix: 'L', circuitsCount: 8 }
    ],
    enabledComponents: ['Diferenciales', 'Supresores'],
    extraComponents: {
      Diferenciales: [1, 2, 3],
      Supresores: [1]
    },
    extraConditions: {
      'Puesta a tierra verificada': true,
      'Señalización presente': true,
      'Libre de obstáculos': false
    }
  }
};

export default function EquipmentDetailsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use endpoint to fetch specific equipment details
  // const { panelId } = useLocalSearchParams();
  // useEffect(() => {
  //   const fetchDetails = async () => {
  //     const data = await supabaseService.getPanelDetails(panelId);
  //     setEquipment(data);
  //   };
  //   fetchDetails();
  // }, [panelId]);

  const { codigo, name, values } = MOCK_EQUIPMENT_DETAILS;

  const handleStartMaintenance = () => {
    setIsLoading(true);
    // Simulate loading for 1s then navigate
    setTimeout(() => {
      setIsLoading(false);
      router.push("/maintenance/pre-maintenance-photos");
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
        <Text style={styles.equipmentLabel}>Equipo {name || codigo}</Text>
        <Text style={styles.stepTitleStrong}>Resumen del Estado Actual</Text>

        {/* Basic Info */}
        <View style={styles.componentSection}>
          <Text style={styles.componentSectionTitle}>Información Básica</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tipo:</Text>
            <Text style={styles.summaryValue}>{values.panelType}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Voltaje:</Text>
            <Text style={styles.summaryValue}>{values.voltage} V</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fases:</Text>
            <Text style={styles.summaryValue}>{values.phase}</Text>
          </View>
        </View>

        {/* ITG Info */}
        <View style={styles.componentSection}>
          <Text style={styles.componentSectionTitle}>Interruptores Generales</Text>
          {values.itgDescriptions.map((desc, idx) => (
            <View key={idx} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IT-G{idx + 1}:</Text>
              <Text style={styles.summaryValue}>{desc || 'Sin descripción'}</Text>
            </View>
          ))}
        </View>

        {/* Circuits Info */}
        <View style={styles.componentSection}>
          <Text style={styles.componentSectionTitle}>Circuitos</Text>
          {values.itgCircuits.map((itg, idx) => (
            <View key={idx} style={{ marginBottom: 8 }}>
              <Text style={[styles.cnLabel, { fontWeight: '600', color: Colors.light.text, fontSize: 14 }]}>
                IT-G{idx + 1} ({itg.cnPrefix} - {itg.circuitsCount} circuitos)
              </Text>
            </View>
          ))}
        </View>

        {/* Extra Components */}
        <View style={styles.componentSection}>
          <Text style={styles.componentSectionTitle}>Componentes Adicionales</Text>
          {values.enabledComponents.length === 0 ? (
            <Text style={styles.emptyStateText}>Ninguno seleccionado</Text>
          ) : (
            values.enabledComponents.map((comp) => (
              <View key={comp} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{comp}:</Text>
                <Text style={styles.summaryValue}>{values.extraComponents[comp as keyof typeof values.extraComponents]?.length || 0}</Text>
              </View>
            ))
          )}
        </View>

        {/* Extra Conditions */}
        <View style={styles.componentSection}>
          <Text style={styles.componentSectionTitle}>Condiciones Adicionales</Text>
          {Object.entries(values.extraConditions).map(([key, value]) => (
            value && (
              <View key={key} style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{key}</Text>
                <Text style={styles.summaryValue}>Sí</Text>
              </View>
            )
          ))}
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
