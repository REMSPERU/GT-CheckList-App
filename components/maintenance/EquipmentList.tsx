import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BaseEquipment } from '@/types/api';

export interface EquipmentListProps<T extends BaseEquipment> {
  items: T[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  selectedIds: Set<string>;
  /** Optional - if undefined, selection is disabled (users without permissions) */
  onToggleSelection?: (id: string) => void;
  onItemPress: (item: T) => void;
  /** Custom function to extract display label from an item */
  renderLabel?: (item: T) => string;
  /** Custom function to extract secondary text (shown below label) */
  renderSubtitle?: (item: T) => string | null;
}

/**
 * Reusable equipment list component for rendering equipment cards.
 * Works with any equipment type that extends BaseEquipment.
 */
export function EquipmentList<T extends BaseEquipment>({
  items,
  isLoading,
  isError,
  errorMessage = 'Error al cargar los equipos',
  emptyMessage = 'No hay equipos disponibles con este filtro.',
  loadingMessage = 'Cargando equipos...',
  selectedIds,
  onToggleSelection,
  onItemPress,
  renderLabel,
  renderSubtitle,
}: EquipmentListProps<T>) {
  const getLabel = (item: T): string => {
    if (renderLabel) {
      return renderLabel(item);
    }
    // Default: use codigo or equipment_detail.rotulo
    return item.codigo || (item.equipment_detail as any)?.rotulo || 'N/A';
  };

  const renderItem = (item: T) => {
    const isSelected = selectedIds.has(item.id);
    const isConfigured = item.config;

    const ItemContent = () => {
      const subtitle = renderSubtitle ? renderSubtitle(item) : null;
      return (
        <>
          <View style={styles.itemInfoColumn}>
            <Text style={styles.itemName}>{getLabel(item)}</Text>
            {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color="#6B7280"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.itemLocation}>{item.ubicacion}</Text>
            </View>
          </View>

          {!isConfigured && (
            <View style={styles.statusContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color="#D97706"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.notConfiguredLabel}>Sin configurar</Text>
            </View>
          )}

          {isConfigured && (
            <View style={styles.actionIconContainer}>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
          )}
        </>
      );
    };

    // Not configured: entire card is pressable, no selection circle
    if (!isConfigured) {
      return (
        <TouchableOpacity
          key={item.id}
          style={styles.itemCard}
          onPress={() => onItemPress(item)}
          activeOpacity={0.7}>
          <View style={[styles.radioCircle, styles.radioCircleHidden]} />
          <ItemContent />
        </TouchableOpacity>
      );
    }

    // Configured: selection circle on the left (if selection enabled), content area navigates
    // If onToggleSelection is not provided, hide selection UI completely
    const canSelect = !!onToggleSelection;

    return (
      <View
        key={item.id}
        style={[styles.itemCard, isSelected && styles.itemCardSelected]}>
        {canSelect ? (
          <TouchableOpacity
            style={styles.selectionArea}
            onPress={() => onToggleSelection(item.id)}>
            <View
              style={[
                styles.radioCircle,
                isSelected && styles.radioCircleSelected,
              ]}>
              {isSelected && <View style={styles.radioInnerCircle} />}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.radioCircle, styles.radioCircleHidden]} />
        )}

        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => onItemPress(item)}>
          <ItemContent />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return <View style={styles.listContainer}>{items.map(renderItem)}</View>;
}

const styles = StyleSheet.create({
  listContainer: {
    flexDirection: 'column',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  itemCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: '#0891B2',
    backgroundColor: '#F0FDFA',
  },
  selectionArea: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioCircleHidden: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  radioCircleSelected: {
    borderColor: '#0891B2',
    backgroundColor: '#fff',
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0891B2',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLocation: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  actionIconContainer: {
    paddingLeft: 8,
  },
  statusContainer: {
    paddingLeft: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  notConfiguredLabel: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
});
