import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EquipmentSummaryCard } from '@/components/qr-equipment/equipment-summary-card';
import { QREquipmentActions } from '@/components/qr-equipment/qr-equipment-actions';
import type {
  QREquipmentAction,
  QREquipmentRouteParams,
} from '@/types/qr-equipment';

export default function QREquipmentOptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<QREquipmentRouteParams>();

  const routeParams = useMemo<QREquipmentRouteParams>(
    () => ({
      buildingId: params.buildingId || '',
      buildingName: params.buildingName || '',
      equipamentoId: params.equipamentoId || '',
      equipamentoNombre: params.equipamentoNombre || '',
      frecuencia: params.frecuencia || 'MENSUAL',
      equipoId: params.equipoId || '',
      equipoCodigo: params.equipoCodigo || '',
      equipoUbicacion: params.equipoUbicacion || '',
      equipoDetalleUbicacion: params.equipoDetalleUbicacion || '',
    }),
    [
      params.buildingId,
      params.buildingName,
      params.equipoCodigo,
      params.equipoDetalleUbicacion,
      params.equipoId,
      params.equipoUbicacion,
      params.equipamentoId,
      params.equipamentoNombre,
      params.frecuencia,
    ],
  );

  const actions = useMemo<QREquipmentAction[]>(
    () => [
      {
        key: 'checklist',
        title: 'Checklist',
        description: 'Registrar la inspeccion operativa de este equipo.',
        iconName: 'fact-check',
        onPress: () => {
          router.push({ pathname: '/checklist/form', params: routeParams });
        },
      },
      {
        key: 'description',
        title: 'Descripcion',
        description: 'Ver datos, ubicacion y detalle tecnico disponible.',
        iconName: 'description',
        onPress: () => {
          router.push({
            pathname: '/qr-equipment/description',
            params: routeParams,
          });
        },
      },
    ],
    [routeParams, router],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver">
          <MaterialIcons name="chevron-left" size={28} color="#111827" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Equipo</Text>
          <Text style={styles.headerSubtitle}>Seleccione una accion</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <EquipmentSummaryCard {...routeParams} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Opciones</Text>
        </View>

        <QREquipmentActions actions={actions} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.78,
  },
});
