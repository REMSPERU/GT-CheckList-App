import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BaseEquipment } from '@/types/api';
import type { SyncStatus } from '@/services/sync-queue';

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
  /** Optional - triggered on long press for delete/edit actions */
  onLongPress?: (item: T) => void;
  /** Custom function to extract display label from an item */
  renderLabel?: (item: T) => string;
  /** Custom function to extract secondary text (shown below label) */
  renderSubtitle?: (item: T) => string | null;
  /** Optional - callback for manual sync retry */
  onRetrySync?: (itemId: string) => void;
  /** Optional - map to check if item is auto-retrying */
  isAutoRetrying?: (itemId: string) => boolean;
  /** Optional - map to check if item needs manual retry */
  needsManualRetry?: (itemId: string) => boolean;

  // FlatList performance and layout props
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: any;
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
  onLongPress,
  renderLabel,
  renderSubtitle,
  onRetrySync,
  isAutoRetrying,
  needsManualRetry,
  ListHeaderComponent,
  ListFooterComponent,
  refreshing,
  onRefresh,
  contentContainerStyle,
}: EquipmentListProps<T>) {
  const getLabel = useCallback(
    (item: T): string => {
      if (renderLabel) {
        return renderLabel(item);
      }
      // Default: use codigo or equipment_detail.rotulo
      return item.codigo || (item.equipment_detail as any)?.rotulo || 'N/A';
    },
    [renderLabel],
  );

  const renderBadge = useCallback(
    (item: T) => {
      const syncStatus = (item as any).syncStatus as SyncStatus | null;
      const itemNeedsManualRetry = needsManualRetry?.(item.id);
      const itemIsAutoRetrying = isAutoRetrying?.(item.id);

      // Priority: manual retry needed > auto-retrying > pending/syncing
      if (itemNeedsManualRetry && onRetrySync) {
        return (
          <TouchableOpacity
            style={styles.syncBadgeError}
            onPress={() => onRetrySync(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name="alert-circle"
              size={14}
              color="#DC2626"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.syncBadgeErrorText}>Reintentar</Text>
          </TouchableOpacity>
        );
      }

      if (itemIsAutoRetrying) {
        return (
          <View style={styles.syncBadgePending}>
            <ActivityIndicator
              size={12}
              color="#D97706"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.syncBadgePendingText}>Reintentando...</Text>
          </View>
        );
      }

      if (syncStatus === 'syncing') {
        return (
          <View style={styles.syncBadgePending}>
            <ActivityIndicator
              size={12}
              color="#0891B2"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.syncBadgeSyncingText}>Sincronizando...</Text>
          </View>
        );
      }

      if (syncStatus === 'pending') {
        return (
          <View style={styles.syncBadgePending}>
            <Ionicons
              name="cloud-upload-outline"
              size={14}
              color="#D97706"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.syncBadgePendingText}>Pendiente</Text>
          </View>
        );
      }

      if (syncStatus === 'error' || syncStatus === 'fatal_error') {
        if (onRetrySync) {
          return (
            <TouchableOpacity
              style={styles.syncBadgeError}
              onPress={() => onRetrySync(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons
                name="refresh"
                size={14}
                color="#DC2626"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.syncBadgeErrorText}>Reintentar</Text>
            </TouchableOpacity>
          );
        }
        return (
          <View style={styles.syncBadgeError}>
            <Ionicons
              name="alert-circle"
              size={14}
              color="#DC2626"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.syncBadgeErrorText}>Error</Text>
          </View>
        );
      }

      return null;
    },
    [needsManualRetry, isAutoRetrying, onRetrySync],
  );

  const renderItem: ListRenderItem<T> = useCallback(
    ({ item }) => {
      const isSelected = selectedIds.has(item.id);
      const isConfigured = item.config;
      const canSelect = !!onToggleSelection;
      const subtitle = renderSubtitle ? renderSubtitle(item) : null;

      const ItemContent = () => (
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
              <Text style={styles.itemLocation}>
                {item.ubicacion}
                {item.detalle_ubicacion ? ` - ${item.detalle_ubicacion}` : ''}
              </Text>
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
            <View style={styles.rightSection}>
              {renderBadge(item)}
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
          )}
        </>
      );

      if (!isConfigured) {
        return (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => onItemPress(item)}
            onLongPress={() => onLongPress?.(item)}
            activeOpacity={0.7}>
            <View style={[styles.radioCircle, styles.radioCircleHidden]} />
            <ItemContent />
          </TouchableOpacity>
        );
      }

      return (
        <View style={[styles.itemCard, isSelected && styles.itemCardSelected]}>
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
            onPress={() => onItemPress(item)}
            onLongPress={() => onLongPress?.(item)}
            activeOpacity={0.7}>
            <ItemContent />
          </TouchableOpacity>
        </View>
      );
    },
    [
      selectedIds,
      onToggleSelection,
      onItemPress,
      onLongPress,
      renderSubtitle,
      getLabel,
      renderBadge,
    ],
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    ),
    [emptyMessage],
  );

  const ListLoading = useMemo(
    () => (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    ),
    [loadingMessage],
  );

  const ListError = useMemo(
    () => (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    ),
    [errorMessage],
  );

  if (isLoading && items.length === 0) return ListLoading;
  if (isError && items.length === 0) return ListError;

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
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
    marginHorizontal: 16,
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  syncBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgePendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  syncBadgeSyncingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0891B2',
  },
  syncBadgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeErrorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
});
