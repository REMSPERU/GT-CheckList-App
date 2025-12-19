import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

interface EquipmentType {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap | keyof typeof Feather.glyphMap;
  iconType: 'MaterialIcons' | 'Feather' | 'Ionicons';
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  { id: '1', name: 'Pozo a tierra', icon: 'build', iconType: 'MaterialIcons' },
  { id: '2', name: 'Luces de emergencia', icon: 'home', iconType: 'Feather' },
  { id: '3', name: 'Ascensores', icon: 'assignment', iconType: 'MaterialIcons' },
  { id: '4', name: 'Tableros electricos', icon: 'show-chart', iconType: 'MaterialIcons' },
];

export default function MaintenanceSelectionScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEquipment = EQUIPMENT_TYPES.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderIcon = (item: EquipmentType) => {
    const color = "#06B6D4";
    const size = 24;

    if (item.iconType === 'MaterialIcons') {
      return <MaterialIcons name={item.icon as any} size={size} color={color} />;
    } else if (item.iconType === 'Feather') {
      return <Feather name={item.icon as any} size={size} color={color} />;
    } else {
      return <Ionicons name={item.icon as any} size={size} color={color} />;
    }
  };

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
          <Text style={styles.headerTitle}>Mantenimiento</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar equipos"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredEquipment.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push("/maintenance/equipment-maintenance-list")}
            >
              <View style={styles.iconContainer}>
                {renderIcon(item)}
              </View>
              <Text style={styles.cardTitle}>{item.name}</Text>
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
    backgroundColor: '#F3F4F6', // Lighter grey for the background as in image
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginTop: 15,
    height: 48,
    borderWidth: 1,
    borderColor: '#06B6D499', // Subtle blue border as in image
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  listContainer: {
    marginTop: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 15,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
