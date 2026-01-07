import React, { useState, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FilterState {
  config: boolean | null;
  locations: string[];
}

export interface EquipmentFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  title: string;
  /** Building data for location filters */
  building?: {
    basement?: number;
    floor?: number;
  };
  /** Optional additional filter content to render before location filters */
  additionalFilters?: ReactNode;
}

/**
 * Reusable filter modal for equipment screens.
 * Provides config status and location filters.
 */
export function EquipmentFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  title,
  building,
  additionalFilters,
}: EquipmentFilterModalProps) {
  const [tempConfig, setTempConfig] = useState<boolean | null>(
    initialFilters.config,
  );
  const [tempLocations, setTempLocations] = useState<string[]>(
    initialFilters.locations,
  );

  // Sync temp state when modal opens
  useEffect(() => {
    if (visible) {
      setTempConfig(initialFilters.config);
      setTempLocations(initialFilters.locations);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply({ config: tempConfig, locations: tempLocations });
    onClose();
  };

  const handleReset = () => {
    setTempConfig(null);
    setTempLocations([]);
  };

  const toggleLocation = (loc: string) => {
    setTempLocations(prev => {
      const newLocs = new Set(prev);
      if (newLocs.has(loc)) {
        newLocs.delete(loc);
      } else {
        newLocs.add(loc);
      }
      return Array.from(newLocs);
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Additional Filters (e.g., Panel Type) */}
            {additionalFilters}

            {/* Config Status Filter */}
            <Text style={styles.filterLabel}>Estado de Configuración</Text>
            <View style={styles.filterOptions}>
              {[
                { label: 'Todos', value: null },
                { label: 'Configurados', value: true },
                { label: 'No Configurados', value: false },
              ].map(option => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.filterOptionChip,
                    tempConfig === option.value &&
                      styles.activeFilterOptionChip,
                  ]}
                  onPress={() => setTempConfig(option.value)}>
                  <Text
                    style={[
                      styles.filterOptionText,
                      tempConfig === option.value &&
                        styles.activeFilterOptionText,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location Filter */}
            <Text style={styles.filterLabel}>Ubicación</Text>

            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.locationCheckboxItem,
                  tempLocations.length === 0 && styles.locationCheckboxSelected,
                ]}
                onPress={() => setTempLocations([])}>
                <Ionicons
                  name={
                    tempLocations.length === 0 ? 'checkbox' : 'square-outline'
                  }
                  size={20}
                  color={tempLocations.length === 0 ? '#0891B2' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.locationCheckboxText,
                    tempLocations.length === 0 &&
                      styles.activeLocationCheckboxText,
                  ]}>
                  Todos
                </Text>
              </TouchableOpacity>
            </View>

            {building?.basement && building.basement > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                  Sótanos
                </Text>
                <View style={styles.locationGrid}>
                  {Array.from(
                    { length: building.basement },
                    (_, i) => `Sótano ${i + 1}`,
                  ).map(loc => {
                    const isSelected = tempLocations.includes(loc);
                    return (
                      <TouchableOpacity
                        key={loc}
                        style={[
                          styles.locationCheckboxItem,
                          isSelected && styles.locationCheckboxSelected,
                        ]}
                        onPress={() => toggleLocation(loc)}>
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? '#0891B2' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.locationCheckboxText,
                            isSelected && styles.activeLocationCheckboxText,
                          ]}>
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {building?.floor && building.floor > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                  Pisos
                </Text>
                <View style={styles.locationGrid}>
                  {Array.from(
                    { length: building.floor },
                    (_, i) => `Piso ${i + 1}`,
                  ).map(loc => {
                    const isSelected = tempLocations.includes(loc);
                    return (
                      <TouchableOpacity
                        key={loc}
                        style={[
                          styles.locationCheckboxItem,
                          isSelected && styles.locationCheckboxSelected,
                        ]}
                        onPress={() => toggleLocation(loc)}>
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? '#0891B2' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.locationCheckboxText,
                            isSelected && styles.activeLocationCheckboxText,
                          ]}>
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Extras: Azotea */}
            <View>
              <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                Otros
              </Text>
              <TouchableOpacity
                style={[
                  styles.locationCheckboxItem,
                  tempLocations.includes('Azotea') &&
                    styles.locationCheckboxSelected,
                ]}
                onPress={() => toggleLocation('Azotea')}>
                <Ionicons
                  name={
                    tempLocations.includes('Azotea')
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={20}
                  color={
                    tempLocations.includes('Azotea') ? '#0891B2' : '#9CA3AF'
                  }
                />
                <Text
                  style={[
                    styles.locationCheckboxText,
                    tempLocations.includes('Azotea') &&
                      styles.activeLocationCheckboxText,
                  ]}>
                  Azotea
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterOptionChip: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  activeFilterOptionText: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#0891B2',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: '45%',
    marginBottom: 4,
  },
  locationCheckboxSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0891B2',
  },
  locationCheckboxText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  activeLocationCheckboxText: {
    color: '#0891B2',
  },
});
