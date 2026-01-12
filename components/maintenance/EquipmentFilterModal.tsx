import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
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
  /** Array of available locations extracted from actual equipment data */
  availableLocations?: string[];
  /** Optional additional filter content to render before location filters */
  additionalFilters?: ReactNode;
}

/**
 * Reusable filter modal for equipment screens.
 * Provides config status and location filters based on actual data.
 */
export function EquipmentFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  title,
  availableLocations = [],
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

  const handleApply = useCallback(() => {
    onApply({ config: tempConfig, locations: tempLocations });
    onClose();
  }, [onApply, onClose, tempConfig, tempLocations]);

  const handleReset = useCallback(() => {
    setTempConfig(null);
    setTempLocations([]);
  }, []);

  const toggleLocation = useCallback((loc: string) => {
    setTempLocations(prev => {
      const newLocs = new Set(prev);
      if (newLocs.has(loc)) {
        newLocs.delete(loc);
      } else {
        newLocs.add(loc);
      }
      return Array.from(newLocs);
    });
  }, []);

  // Pre-compute and sort unique locations for faster rendering
  const sortedLocations = useMemo(() => {
    const uniqueLocations = [...new Set(availableLocations)].filter(Boolean);

    // Sort locations naturally (Piso 1, Piso 2... Sótano 1, Sótano 2... Others)
    return uniqueLocations.sort((a, b) => {
      const getOrder = (loc: string) => {
        if (loc.startsWith('Sótano')) return 0;
        if (loc.startsWith('Piso')) return 1;
        return 2;
      };
      const orderDiff = getOrder(a) - getOrder(b);
      if (orderDiff !== 0) return orderDiff;

      // Extract numbers for natural sort
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB || a.localeCompare(b);
    });
  }, [availableLocations]);

  // Config status options - memoized
  const configOptions = useMemo(
    () => [
      { label: 'Todos', value: null },
      { label: 'Configurados', value: true },
      { label: 'No Configurados', value: false },
    ],
    [],
  );

  // Memoized location item component for better performance
  const LocationItem = useCallback(
    ({ loc, isSelected }: { loc: string; isSelected: boolean }) => (
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
    ),
    [toggleLocation],
  );

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
              {configOptions.map(option => (
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

            {/* Location Filter - Shows only locations from actual data */}
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

            {/* Dynamic locations from actual data */}
            {sortedLocations.length > 0 && (
              <View style={styles.locationGrid}>
                {sortedLocations.map(loc => (
                  <LocationItem
                    key={loc}
                    loc={loc}
                    isSelected={tempLocations.includes(loc)}
                  />
                ))}
              </View>
            )}

            {sortedLocations.length === 0 && (
              <Text style={styles.noLocationsText}>
                No hay ubicaciones disponibles
              </Text>
            )}
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
  noLocationsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
