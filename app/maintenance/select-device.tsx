import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import DefaultHeader from '@/components/default-header';
import MaintenanceCard from '@/components/maintenance-card';

export default function SelectDeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);

  useEffect(() => {
    if (params.building) {
      try {
        setBuilding(JSON.parse(params.building as string));
      } catch {}
    }
  }, [params.building]);

  const handleOptionPress = (type: string, title: string) => {
    console.log('Selected maintenance type:', title);
    console.log('Building:', building);
    
    if (type === 'tableros-electricos') {
      router.push({
        pathname: '/maintenance/electrical-panels',
        params: {
          building: JSON.stringify(building)
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <DefaultHeader
          title={building ? `Mantenimiento - ${building.name}` : 'Mantenimiento'}
          searchPlaceholder="Buscar equipos"
        />

        {/* Lista de opciones - margen top: 16px, padding horizontal: 24px */}
        <View style={styles.listWrapper}>
          <MaintenanceCard
            icon="construct-outline"
            title="Pozo a tierra"
            onPress={() => handleOptionPress('pozo-tierra', 'Pozo a tierra')}
          />
          <MaintenanceCard
            icon="home-outline"
            title="Luces de emergencia"
            onPress={() => handleOptionPress('luces-emergencia', 'Luces de emergencia')}
          />
          <MaintenanceCard
            icon="clipboard-outline"
            title="Ascensores"
            onPress={() => handleOptionPress('ascensores', 'Ascensores')}
          />
          <MaintenanceCard
            icon="stats-chart-outline"
            title="Tableros electricos"
            onPress={() => handleOptionPress('tableros-electricos', 'Tableros electricos')}
          />
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
  listWrapper: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
});
