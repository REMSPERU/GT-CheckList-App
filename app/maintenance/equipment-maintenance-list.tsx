import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MaintenanceEquipment {
  id: string;
  code: string;
  location: string;
  deadline: string;
  label: string;
  status: 'Pendiente' | 'Completado';
}

const PREVENTIVE_MOCK: MaintenanceEquipment[] = [
  {
    id: '1',
    code: 'LEU-TBELEC-001',
    location: 'Piso 2',
    deadline: 'Hoy, 17 Dic.',
    label: 'asdajhdjhadasghghsfa',
    status: 'Pendiente',
  },
  {
    id: '2',
    code: 'LEU-TBELEC-002',
    location: 'Piso 2',
    deadline: 'Hoy, 17 Dic.',
    label: 'asdajhdjhadasghghsfa2',
    status: 'Pendiente',
  },
];

const CORRECTIVE_MOCK: MaintenanceEquipment[] = [
  {
    id: '3',
    code: 'LEU-TBELEC-003',
    location: 'Piso 1',
    deadline: 'Mañana, 18 Dic.',
    label: 'rtqyweuioasdfghjkl',
    status: 'Pendiente',
  },
];

export default function EquipmentMaintenanceListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Preventivo' | 'Correctivo'>('Preventivo');

  // TODO: Use endpoint to fetch equipment maintenance data
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const response = await fetch(`YOUR_ENDPOINT_HERE?type=${activeTab}`);
  //     const data = await response.json();
  //     // setEquipmentList(data);
  //   };
  //   fetchData();
  // }, [activeTab]);

  const data = activeTab === 'Preventivo' ? PREVENTIVE_MOCK : CORRECTIVE_MOCK;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="home-repair-service" size={20} color="white" />
          </View>
          <Text style={styles.headerTitle}>Mantenimiento programado</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Preventivo' && styles.activeTab]}
            onPress={() => setActiveTab('Preventivo')}
          >
            <Text style={[styles.tabText, activeTab === 'Preventivo' && styles.activeTabText]}>Preventivo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Correctivo' && styles.activeTabWhite]}
            onPress={() => setActiveTab('Correctivo')}
          >
            <Text style={[styles.tabText, activeTab === 'Correctivo' && styles.activeTabTextDark]}>Correctivo</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {data.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                index === 0 && activeTab === 'Preventivo' && styles.highlightedCard
              ]}
              onPress={() => router.push("/maintenance/equipment-details")}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardCode}>{item.code}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color="#4B5563" />
                <Text style={styles.infoLabel}>Ubicación:</Text>
                <Text style={styles.infoValue}>{item.location}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color="#4B5563" />
                <Text style={styles.infoLabel}>Fecha Límite:</Text>
                <Text style={styles.infoValue}>{item.deadline}</Text>
              </View>

              <Text style={styles.labelField}>Rótulo: {item.label}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 10,
  },
  headerIconContainer: {
    backgroundColor: '#06B6D4',
    padding: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  activeTabWhite: {
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#fff',
  },
  activeTabTextDark: {
    color: '#11181C',
  },
  listContainer: {
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  highlightedCard: {
    borderColor: '#C084FC', // Purple border as seen in the image for the first card
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  infoValue: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '500',
  },
  labelField: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 26,
    marginTop: 5,
  },
});
