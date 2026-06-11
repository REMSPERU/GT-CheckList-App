import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InventorySistema } from '@/types/inventory';

interface SystemCardProps {
  item: InventorySistema;
  onPress: (sistema: InventorySistema) => void;
}

export const SystemCard = memo(function SystemCard({
  item,
  onPress,
}: SystemCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Sistema ${item.nombre}`}
      accessibilityHint="Navega a los equipamentos del sistema">
      <View style={styles.iconWrap}>
        <Ionicons name="layers-outline" size={24} color="#0891B2" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.nombre}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="cube-outline" size={13} color="#64748B" />
            <Text style={styles.statText}>
              {item.equipamentos_count} tipo
              {item.equipamentos_count !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.stat}>
            <Ionicons name="hardware-chip-outline" size={13} color="#64748B" />
            <Text style={styles.statText}>
              {item.equipos_count} equipo{item.equipos_count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
  },
});
