import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EquipmentStatusBadge } from './equipment-status-badge';
import { translateUbicacion } from '@/types/inventory';
import type { InventoryEquipo } from '@/types/inventory';

interface EquipoCardProps {
  item: InventoryEquipo;
  onPress: (equipo: InventoryEquipo) => void;
}

export const EquipoCard = memo(function EquipoCard({
  item,
  onPress,
}: EquipoCardProps) {
  const ubicacionLabel = translateUbicacion(item.ubicacion);
  const hasDetalle =
    item.detalle_ubicacion && item.detalle_ubicacion.trim().length > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Equipo ${item.codigo}`}
      accessibilityHint="Navega al detalle del equipo">
      <View style={styles.codeWrap}>
        <Ionicons name="hardware-chip-outline" size={18} color="#0891B2" />
        <Text style={styles.codigo} numberOfLines={1}>
          {item.codigo}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.ubicacionWrap}>
          <Ionicons name="location-outline" size={13} color="#64748B" />
          <Text style={styles.ubicacion}>
            {ubicacionLabel}
            {hasDetalle ? ` · ${item.detalle_ubicacion}` : ''}
          </Text>
        </View>
        <EquipmentStatusBadge estatus={item.estatus} />
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#CBD5E1"
        style={styles.chevron}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingRight: 28,
  },
  codigo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ubicacionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  ubicacion: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  chevron: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -10,
  },
});
