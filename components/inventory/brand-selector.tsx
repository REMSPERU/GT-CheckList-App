import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { useBrandsForEquipment } from '@/hooks/use-brands-query';

interface BrandSelectorProps {
  value: string;
  onChange: (value: string) => void;
  equipamentoId?: string | null;
  equipamentoAbreviatura?: string | null;
  equipamentoNombre?: string | null;
  error?: string;
}

export function BrandSelector({
  value,
  onChange,
  equipamentoId,
  equipamentoAbreviatura,
  equipamentoNombre,
  error,
}: BrandSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Cargar marcas ( SQLite local con fallback estático )
  const { data: brands, isLoading } = useBrandsForEquipment(
    equipamentoId,
    equipamentoAbreviatura,
    equipamentoNombre,
  );

  const brandOptions = useMemo(() => brands || [], [brands]);

  // Modo marca personalizada ("OTROS") y control de escritura
  const isTypingRef = useRef(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  // Sincronizar estado cuando el prop `value` cambia desde el exterior
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (isTypingRef.current) {
      isTypingRef.current = false;
    } else {
      if (!value) {
        setIsCustomMode(false);
        setCustomText('');
      } else {
        const matchesStandard = brandOptions.some(
          b =>
            b.nombre.toUpperCase() === value.toUpperCase() &&
            b.nombre !== 'OTROS',
        );
        if (matchesStandard) {
          setIsCustomMode(false);
          setCustomText('');
        } else {
          setIsCustomMode(true);
          setCustomText(value === 'OTROS' ? '' : value);
        }
      }
    }
  }

  // Filtrar marcas según la búsqueda en tiempo real
  const filteredBrands = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    if (!query) return brandOptions;
    return brandOptions.filter(b => b.nombre.toLowerCase().includes(query));
  }, [brandOptions, searchText]);

  const handleSelect = (brandName: string) => {
    const upperName = brandName.toUpperCase();
    if (upperName === 'OTROS') {
      setIsCustomMode(true);
      setCustomText('');
      onChange('OTROS');
    } else {
      setIsCustomMode(false);
      setCustomText('');
      onChange(brandName);
    }
    setModalVisible(false);
    setSearchText('');
  };

  const handleCustomTextChange = (text: string) => {
    isTypingRef.current = true;
    setCustomText(text);
    onChange(text);
  };

  // Determinar la etiqueta a mostrar en el botón trigger
  const displayLabel = useMemo(() => {
    if (isCustomMode) return 'OTROS (Especificado)';
    if (!value) return 'Selecciona una marca';
    return value;
  }, [value, isCustomMode]);

  return (
    <View style={styles.container}>
      {/* Botón trigger */}
      <Pressable
        style={({ pressed }) => [
          styles.triggerBtn,
          error ? styles.triggerBtnError : null,
          pressed && styles.pressed,
        ]}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar marca">
        <View style={styles.triggerLeft}>
          <Ionicons
            name="pricetag-outline"
            size={18}
            color={error ? '#EF4444' : '#64748B'}
            style={styles.triggerIcon}
          />
          <Text
            style={[
              styles.triggerText,
              !value && styles.placeholderText,
              error && styles.errorTextLabel,
            ]}>
            {displayLabel}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
      </Pressable>

      {/* Input de texto para marca custom (visible si isCustomMode está activo) */}
      {isCustomMode && (
        <View style={styles.customInputWrap}>
          <Text style={styles.customLabel}>Escribe la marca del equipo:</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={customText}
            onChangeText={handleCustomTextChange}
            placeholder="ej. MARCA_PROPIA_PERU"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
          />
        </View>
      )}

      {/* Modal buscador */}
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
            <View style={styles.dragHandle} />

            {/* Header del Modal */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Seleccionar Marca</Text>
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

            {/* Buscador */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#94A3B8"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar marca (ej. Otis, Schindler)..."
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
                autoCorrect={false}
                clearButtonMode="while-editing"
                autoCapitalize="none"
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            {/* Listado de Marcas */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0891B2" />
                <Text style={styles.loadingText}>Cargando catálogo de marcas...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredBrands}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected =
                    (isCustomMode && item.nombre.toUpperCase() === 'OTROS') ||
                    (!isCustomMode &&
                      value.toUpperCase() === item.nombre.toUpperCase());

                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleSelect(item.nombre)}>
                      <View style={styles.optionInfo}>
                        <Ionicons
                          name="pricetag-outline"
                          size={18}
                          color={isSelected ? '#0891B2' : '#94A3B8'}
                          style={styles.optionIcon}
                        />
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}>
                          {item.nombre}
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
                    <Text style={styles.emptyText}>No se encontraron marcas</Text>
                    <Pressable
                      style={styles.addNewBrandBtn}
                      onPress={() => handleSelect('OTROS')}>
                      <Text style={styles.addNewBrandBtnText}>
                        Usar Marca Personalizada (Otros)
                      </Text>
                    </Pressable>
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
  errorTextLabel: {
    color: '#B91C1C',
  },
  placeholderText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  pressed: {
    opacity: 0.8,
  },
  customInputWrap: {
    marginTop: 8,
    gap: 4,
  },
  customLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0891B2',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#06B6D4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
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
    minHeight: '55%',
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
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  addNewBrandBtn: {
    marginTop: 8,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#06B6D4',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addNewBrandBtnText: {
    color: '#0891B2',
    fontSize: 13,
    fontWeight: '700',
  },
});
