import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useScheduledMaintenances } from '@/hooks/use-maintenance';

export default function ScheduledMaintenanceScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Hoy' | 'Esta Semana' | 'Todos'>(
    'Todos',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: maintenanceData = [],
    isLoading,
    refetch,
    isRefetching,
  } = useScheduledMaintenances();

  const filterData = () => {
    if (!maintenanceData) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay())); // End of week (Saturday/Sunday depending on locale, usually fine for basic filter)

    return maintenanceData.filter((item: any) => {
      // 1. Filter by Search
      const searchLower = searchQuery.toLowerCase();
      const code = item.equipos?.codigo?.toLowerCase() || '';
      const address = item.equipos?.properties?.address?.toLowerCase() || '';
      const name = item.equipos?.properties?.name?.toLowerCase() || '';

      const matchesSearch =
        code.includes(searchLower) ||
        address.includes(searchLower) ||
        name.includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Filter by Date Tab
      const itemDate = new Date(item.dia_programado);
      itemDate.setHours(0, 0, 0, 0);

      // Fix timezone offset issue if needed, but assuming simple comparison
      // "Hoy"
      if (activeTab === 'Hoy') {
        return itemDate.getTime() === today.getTime();
      }

      // "Esta Semana"
      if (activeTab === 'Esta Semana') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        return itemDate >= startOfWeek && itemDate <= endOfWeek;
      }

      // "Todos"
      return true;
    });
  };

  // Group filtered data by Property Name (or ID)
  const filteredData = filterData();

  const groupedData = React.useMemo(() => {
    const groups: { [key: string]: any } = {};

    filteredData.forEach((item: any) => {
      // Use ID if available, otherwise name as fallback key
      const propertyId =
        item.equipos?.properties?.id ||
        item.equipos?.properties?.name ||
        'unknown';
      const propertyName =
        item.equipos?.properties?.name || 'Propiedad Desconocida';
      const propertyAddress =
        item.equipos?.properties?.address || 'Sin dirección';

      if (!groups[propertyId]) {
        groups[propertyId] = {
          propertyId,
          propertyName,
          propertyAddress,
          items: [],
          count: 0,
        };
      }
      groups[propertyId].items.push(item);
      groups[propertyId].count += 1;
    });

    return Object.values(groups);
  }, [filteredData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.headerIconContainer}>
            <MaterialIcons name="home-repair-service" size={20} color="white" />
          </View>
          <Text style={styles.headerTitle}>Mantenimiento Programados</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por equipo, propiedad o dirección"
            placeholderTextColor="#BDC1CA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Todos' && styles.activeTab]}
            onPress={() => setActiveTab('Todos')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'Todos' && styles.activeTabText,
              ]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Hoy' && styles.activeTab]}
            onPress={() => setActiveTab('Hoy')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'Hoy' && styles.activeTabText,
              ]}>
              Hoy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'Esta Semana' && styles.activeTabWhite,
            ]}
            onPress={() => setActiveTab('Esta Semana')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'Esta Semana' && styles.activeTabTextDark,
              ]}>
              Esta Semana
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }>
            {groupedData.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>
                  No hay mantenimientos programados para{' '}
                  {activeTab === 'Hoy' ? 'hoy' : 'esta semana'}.
                </Text>
              </View>
            ) : (
              groupedData.map((group: any) => (
                <TouchableOpacity
                  key={group.propertyId}
                  style={styles.card}
                  onPress={() => {
                    if (group.items.length > 0) {
                      // Navigate to equipment list for this property
                      router.push({
                        pathname:
                          '/maintenance/scheduled_maintenance/equipment-maintenance-list',
                        params: { propertyId: group.propertyId },
                      });
                    }
                  }}>
                  <View style={styles.cardIconContainer}>
                    <MaterialIcons name="business" size={24} color="#06B6D4" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{group.propertyName}</Text>
                    <Text style={styles.cardAddress} numberOfLines={2}>
                      {group.propertyAddress}
                    </Text>

                    {/* List of Equipments - HIDDEN as per request, only count shown above */}
                    {/* <View style={{ marginTop: 8 }}>...</View> */}

                    <View style={styles.cardFooter}>
                      {/* Footer content if needed, currently empty/redundant if listing all items above */}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
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
