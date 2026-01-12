import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;

export interface FilterState {
  config: boolean | null;
  locations: string[];
}

export interface EquipmentFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
  title?: string;
  availableLocations?: string[];
  additionalFilters?: ReactNode;
}

export function EquipmentFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  availableLocations = [],
  additionalFilters,
}: EquipmentFilterModalProps) {
  const [tempConfig, setTempConfig] = useState<boolean | null>(
    initialFilters.config,
  );
  const [tempLocations, setTempLocations] = useState<string[]>(
    initialFilters.locations,
  );
  const [modalVisible, setModalVisible] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const isClosing = useRef(false);

  // Pan responder - only for the handle area
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
          const opacity = Math.max(0, 0.5 - gesture.dy / 400);
          overlayOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.5) {
          closeModal();
        } else {
          // Smooth return
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0.5,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  const openModal = useCallback(() => {
    isClosing.current = false;
    setModalVisible(true);
    translateY.setValue(SCREEN_HEIGHT);
    overlayOpacity.setValue(0);

    // Smooth slide up
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, overlayOpacity]);

  const closeModal = useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;

    // Smooth slide down
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
    });
  }, [translateY, overlayOpacity, onClose]);

  useEffect(() => {
    if (visible && !modalVisible) {
      openModal();
    } else if (!visible && modalVisible && !isClosing.current) {
      closeModal();
    }
  }, [visible, modalVisible, openModal, closeModal]);

  useEffect(() => {
    if (visible) {
      setTempConfig(initialFilters.config);
      setTempLocations(initialFilters.locations);
    }
  }, [visible, initialFilters]);

  const handleApply = useCallback(() => {
    onApply({ config: tempConfig, locations: tempLocations });
    closeModal();
  }, [onApply, tempConfig, tempLocations, closeModal]);

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

  const sortedLocations = useMemo(() => {
    const uniqueLocations = [...new Set(availableLocations)].filter(Boolean);
    return uniqueLocations.sort((a, b) => {
      const getOrder = (loc: string) => {
        if (loc.startsWith('Sótano')) return 0;
        if (loc.startsWith('Piso')) return 1;
        return 2;
      };
      const orderDiff = getOrder(a) - getOrder(b);
      if (orderDiff !== 0) return orderDiff;
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB || a.localeCompare(b);
    });
  }, [availableLocations]);

  const configOptions = useMemo(
    () => [
      { label: 'Todos', value: null },
      { label: 'Configurados', value: true },
      { label: 'Sin Configurar', value: false },
    ],
    [],
  );

  if (!modalVisible) return null;

  return (
    <Modal
      animationType="none"
      transparent
      visible={modalVisible}
      onRequestClose={closeModal}
      statusBarTranslucent>
      <View style={styles.container}>
        {/* Overlay */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeModal}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Modal */}
        <Animated.View
          style={[styles.modalContent, { transform: [{ translateY }] }]}>
          {/* Draggable Handle Area */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Filtros</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <View style={styles.closeBtnBg}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Content - Independent from drag */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
            onScroll={e => {
              scrollOffset.current = e.nativeEvent.contentOffset.y;
            }}>
            {additionalFilters}

            <Text style={styles.sectionLabel}>Estado</Text>
            <View style={styles.chipRow}>
              {configOptions.map(option => {
                const isActive = tempConfig === option.value;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setTempConfig(option.value)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Ubicación</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.locChip,
                  tempLocations.length === 0 && styles.locChipActive,
                ]}
                onPress={() => setTempLocations([])}
                activeOpacity={0.7}>
                <Ionicons
                  name={
                    tempLocations.length === 0
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={16}
                  color={tempLocations.length === 0 ? '#0891B2' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.locChipText,
                    tempLocations.length === 0 && styles.locChipTextActive,
                  ]}>
                  Todas
                </Text>
              </TouchableOpacity>

              {sortedLocations.map(loc => {
                const isSelected = tempLocations.includes(loc);
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.locChip, isSelected && styles.locChipActive]}
                    onPress={() => toggleLocation(loc)}
                    activeOpacity={0.7}>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={isSelected ? '#0891B2' : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.locChipText,
                        isSelected && styles.locChipTextActive,
                      ]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {sortedLocations.length === 0 && (
              <Text style={styles.emptyText}>No hay ubicaciones</Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={16} color="#6B7280" />
              <Text style={styles.resetBtnText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Aplicar</Text>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  handleArea: {
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chipActive: {
    backgroundColor: '#0891B2',
    borderColor: '#0891B2',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  locChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  locChipActive: {
    backgroundColor: '#E8F8FA',
    borderColor: '#0891B2',
  },
  locChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  locChipTextActive: {
    color: '#0891B2',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  applyBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0891B2',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
