import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaintenanceHeader from '@/components/maintenance-header';

interface EquipmentOption {
  type: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  {
    type: 'tablero',
    name: 'Tableros Eléctricos',
    icon: 'flash',
    color: '#0891B2',
    description: 'Historial de mantenimiento de tableros',
  },
  {
    type: 'emergencia',
    name: 'Luces de Emergencia',
    icon: 'bulb',
    color: '#0891B2',
    description: 'Historial y reportes de luces de emergencia',
  },
];

export default function EquipmentSelectionScreen() {
  const router = useRouter();
  const { propertyId, propertyName } = useLocalSearchParams<{
    propertyId: string;
    propertyName?: string;
  }>();

  const handleSelectType = (type: string) => {
    router.push({
      pathname: `/equipment-record/${propertyId}/history` as any,
      params: {
        propertyId,
        propertyName,
        equipmentType: type,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <MaintenanceHeader
          title="Historial de Equipos"
          iconName="file-tray-full-outline"
        />

        {propertyName && (
          <View style={styles.propertyBadge}>
            <Ionicons name="business-outline" size={18} color="#06B6D4" />
            <Text style={styles.propertyName}>{propertyName}</Text>
          </View>
        )}

        <Text style={styles.subtitle}>Seleccione el tipo de equipo:</Text>

        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={{ paddingBottom: 20 }}>
          {EQUIPMENT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.type}
              style={styles.card}
              onPress={() => handleSelectType(option.type)}
              activeOpacity={0.8}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: option.color },
                ]}>
                <Ionicons name={option.icon} size={32} color="#fff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{option.name}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0891B2',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginVertical: 16,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
