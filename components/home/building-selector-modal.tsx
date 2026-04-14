import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { PropertyResponse as Property } from '@/types/api';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BuildingSelectorModalProps {
  visible: boolean;
  isLoading: boolean;
  searchInput: string;
  buildings: Property[];
  selectedBuildingId?: string;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelectBuilding: (building: Property) => void;
}

export function BuildingSelectorModal({
  visible,
  isLoading,
  searchInput,
  buildings,
  selectedBuildingId,
  onClose,
  onSearchChange,
  onSelectBuilding,
}: BuildingSelectorModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar inmueble</Text>
            <Pressable
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector">
              <Ionicons name="close" size={20} color="#4B5563" />
            </Pressable>
          </View>

          <View style={styles.searchWrapperModal}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar inmueble"
              placeholderTextColor="#9CA3AF"
              value={searchInput}
              onChangeText={onSearchChange}
            />
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <FlatList
              data={buildings}
              keyExtractor={item => String(item.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item }) => {
                const isSelected = String(item.id) === selectedBuildingId;

                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.buildingRow,
                      isSelected && styles.buildingRowSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => onSelectBuilding(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar ${item.name}`}>
                    <View style={styles.buildingRowLeft}>
                      <View style={styles.buildingRowAvatar}>
                        <Text style={styles.buildingRowAvatarText}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.buildingRowTextWrap}>
                        <Text style={styles.buildingRowName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.address ? (
                          <Text
                            style={styles.buildingRowAddress}
                            numberOfLines={1}>
                            {item.address}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? '#06B6D4' : '#9CA3AF'}
                    />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No se encontraron inmuebles
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,28,0.25)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '82%',
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchWrapperModal: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#11181C',
    fontSize: 14,
  },
  modalListContent: {
    paddingBottom: 24,
  },
  buildingRow: {
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildingRowSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#ECFEFF',
  },
  buildingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  buildingRowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buildingRowAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buildingRowTextWrap: {
    flex: 1,
  },
  buildingRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  buildingRowAddress: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
