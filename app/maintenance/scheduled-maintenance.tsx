import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

// Interface for Maintenance Data
interface MaintenanceItem {
  id: string;
  title: string;
  address: string;
  pendingCount: number;
  status: 'Pendiente' | 'En Proceso' | 'Completado';
  time: string;
  date: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

// Mock Data
const MOCK_DATA: MaintenanceItem[] = [
  {
    id: '1',
    title: 'Centro Empresarial Leuro',
    address: 'Av. P.º de la República 5895, Miraflores 15047',
    pendingCount: 2,
    status: 'Pendiente',
    time: '10:00 AM',
    date: 'Hoy',
    icon: 'business',
  },
  {
    id: '2',
    title: 'Centro empresarial Chacarilla',
    address: 'Pinar 180',
    pendingCount: 5,
    status: 'Pendiente',
    time: '09:00 AM',
    date: 'Mañana',
    icon: 'build',
  },
  {
    id: '3',
    title: 'Torre Pinar',
    address: 'Av. del Pinar 180, Lima 15038',
    pendingCount: 3,
    status: 'Pendiente',
    time: '',
    date: 'Esta semana',
    icon: 'settings',
  },
];

export default function ScheduledMaintenanceScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Hoy' | 'Esta Semana'>('Hoy');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Use endpoint to fetch data
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const response = await fetch('YOUR_ENDPOINT_HERE');
  //     const data = await response.json();
  //     // setMaintainanceData(data);
  //   };
  //   fetchData();
  // }, []);

  const filteredData = MOCK_DATA.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text style={styles.headerTitle}>Mantenimiento Programados</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por equipo o inmueble"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Hoy' && styles.activeTab]}
            onPress={() => setActiveTab('Hoy')}
          >
            <Text style={[styles.tabText, activeTab === 'Hoy' && styles.activeTabText]}>Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Esta Semana' && styles.activeTabWhite]}
            onPress={() => setActiveTab('Esta Semana')}
          >
            <Text style={[styles.tabText, activeTab === 'Esta Semana' && styles.activeTabTextDark]}>Esta Semana</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredData.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push("/maintenance/maintenance-selection")}
            >
              <View style={styles.cardIconContainer}>
                <MaterialIcons name={item.icon} size={24} color="#06B6D4" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardAddress} numberOfLines={2}>{item.address}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.pendingText}>
                    {item.pendingCount} Equipos Pendientes
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                  <Text style={styles.timeText}>
                    {item.date === 'Hoy' || item.date === 'Mañana' ? `${item.date}, ${item.time}` : item.date}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginTop: 20,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
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
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingText: {
    fontSize: 11,
    color: '#4B5563',
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
