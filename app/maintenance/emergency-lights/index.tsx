import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DefaultHeader from '@/components/default-header';

export default function EmergencyLightsScreen() {
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);

  useEffect(() => {
    if (params.building) {
      try {
        setBuilding(JSON.parse(params.building as string));
      } catch (e) {
        console.error('Error parsing building param:', e);
      }
    }
  }, [params.building]);

  return (
    <SafeAreaView style={styles.container}>
      <DefaultHeader
        title={building ? `Luces de Emergencia - ${building.name}` : 'Luces de Emergencia'}
        searchPlaceholder=""
      />

      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          <Ionicons name="flashlight-outline" size={64} color="#0891B2" />
          <Text style={styles.title}>Luces de Emergencia</Text>
          <Text style={styles.subtitle}>
            Esta funcionalidad está en desarrollo
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#11181C',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
