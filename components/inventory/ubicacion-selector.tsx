import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProperty } from '@/hooks/use-property-query';
import { translateUbicacion } from '@/types/inventory';

interface UbicacionSelectorProps {
  propertyId: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

interface LocationOption {
  label: string;
  value: string;
  category: 'floor' | 'basement' | 'special';
}

type TabType = 'floor' | 'basement' | 'special';

export function UbicacionSelector({
  propertyId,
  value,
  onChange,
  error,
}: UbicacionSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('floor');

  // Obtener datos del inmueble (offline-first)
  const { data: property, isLoading } = useProperty(propertyId);

  // Generar opciones dinámicas
  const allOptions = useMemo(() => {
    const floorLimit = property?.floor ?? 32;
    const basementLimit = property?.basement ?? 10;

    const opts: LocationOption[] = [];

    // Especiales
    opts.push({ label: 'Azotea', value: 'AZOTEA', category: 'special' });
    opts.push({ label: 'Semisótano', value: 'SEMISOTANO', category: 'special' });

    // Pisos
    for (let i = 1; i <= floorLimit; i += 1) {
      opts.push({ label: `Piso ${i}`, value: String(i), category: 'floor' });
    }

    // Sótanos
    for (let i = 1; i <= basementLimit; i += 1) {
      opts.push({ label: `Sótano ${i}`, value: `-S${i}`, category: 'basement' });
    }

    return opts;
  }, [property?.floor, property?.basement]);

  // Filtrar opciones por búsqueda y pestaña activa
  const filteredOptions = useMemo(() => {
    if (searchText.trim().length > 0) {
      const query = searchText.toLowerCase().trim();
      return allOptions.filter(opt =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
      );
    }
    return allOptions.filter(opt => opt.category === activeTab);
  }, [allOptions, searchText, activeTab]);

  const handleSelect = (val: string) => {
    onChange(val);
    setModalVisible(false);
    setSearchText('');
  };

  const getOptionIcon = (category: 'floor' | 'basement' | 'special') => {
    switch (category) {
      case 'floor':
        return 'layers-outline';
      case 'basement':
        return 'arrow-down-circle-outline';
      case 'special':
        return 'star-outline';
      default:
        return 'location-outline';
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.triggerBtn,
          error ? styles.triggerBtnError : null,
          pressed && styles.pressed,
        ]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar ubicación">
        <View style={styles.triggerLeft}>
          <Ionicons
            name="location-outline"
            size={18}
            color={error ? '#EF4444' : '#64748B'}
            style={styles.triggerIcon}
          />
          {value ? (
            <Text style={styles.triggerText}>{translateUbicacion(value)}</Text>
          ) : (
            <Text style={styles.placeholderText}>Selecciona una ubicación</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.dismissBackdrop}
            onPress={() => setModalVisible(false)}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetContainer}>
            {/* Drag Handle Indicator */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Seleccionar Ubicación</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal">
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#94A3B8"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar ubicación (ej. Piso 3, Sótano)..."
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            {/* Tabs (Hide when searching) */}
            {searchText.trim().length === 0 && (
              <View style={styles.tabsContainer}>
                <Pressable
                  style={[
                    styles.tabButton,
                    activeTab === 'floor' && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab('floor')}>
                  <Ionicons
                    name="layers-outline"
                    size={14}
                    color={activeTab === 'floor' ? '#0891B2' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'floor' && styles.tabTextActive,
                    ]}>
                    Pisos
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.tabButton,
                    activeTab === 'basement' && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab('basement')}>
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={14}
                    color={activeTab === 'basement' ? '#0891B2' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'basement' && styles.tabTextActive,
                    ]}>
                    Sótanos
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.tabButton,
                    activeTab === 'special' && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab('special')}>
                  <Ionicons
                    name="star-outline"
                    size={14}
                    color={activeTab === 'special' ? '#0891B2' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'special' && styles.tabTextActive,
                    ]}>
                    Especiales
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Loading Indicator */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0891B2" />
                <Text style={styles.loadingText}>Cargando opciones del edificio...</Text>
              </View>
            ) : (
              /* Options List */
              <FlatList
                data={filteredOptions}
                keyExtractor={item => item.value}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isSelected = value === item.value;
                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleSelect(item.value)}>
                      <View style={styles.optionInfo}>
                        <Ionicons
                          name={getOptionIcon(item.category)}
                          size={18}
                          color={isSelected ? '#0891B2' : '#94A3B8'}
                          style={styles.optionIcon}
                        />
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}>
                          {item.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#0891B2" />
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={36} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No se encontraron ubicaciones</Text>
                  </View>
                }
              />
            )}
            <SafeAreaView edges={['bottom']} />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  triggerBtnError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  triggerIcon: {
    marginRight: 10,
  },
  triggerText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  pressed: {
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  dismissBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: '50%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginVertical: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#ECFEFF',
    borderColor: '#06B6D4',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0891B2',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionRowSelected: {
    borderBottomColor: '#CFFAFE',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#0891B2',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
