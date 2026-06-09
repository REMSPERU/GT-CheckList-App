import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryEquipamento } from '@/types/inventory';

// Mapa de abreviatura → icono Ionicons
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  TBELEC: 'stats-chart-outline',
  LUZ: 'flashlight-outline',
  PAT: 'construct-outline',
  CHAI: 'snow-outline',
  CHAG: 'water-outline',
  TOE: 'sync-circle-outline',
  ABL: 'flask-outline',
  BBA: 'git-merge-outline',
  SPLIT: 'thermometer-outline',
  FCU: 'leaf-outline',
  UMA: 'cellular-outline',
};

function getEquipamentoIcon(
  abreviatura: string,
): keyof typeof Ionicons.glyphMap {
  return ICON_MAP[abreviatura] ?? 'cube-outline';
}

interface EquipamentoCardProps {
  item: InventoryEquipamento;
  onPress: (equipamento: InventoryEquipamento) => void;
}

export const EquipamentoCard = memo(function EquipamentoCard({
  item,
  onPress,
}: EquipamentoCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Tipo de equipo ${item.nombre}`}
      accessibilityHint="Navega a la lista de equipos de este tipo">
      <View style={styles.iconWrap}>
        <Ionicons
          name={getEquipamentoIcon(item.abreviatura)}
          size={22}
          color="#0F766E"
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.nombre}
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.abreviatura}>{item.abreviatura}</Text>
          <View style={styles.separator} />
          <Text style={styles.count}>
            {item.equipos_count} equipo{item.equipos_count !== 1 ? 's' : ''}
          </Text>
          {item.frecuencia != null && (
            <>
              <View style={styles.separator} />
              <Text style={styles.frecuencia}>{item.frecuencia}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  abreviatura: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891B2',
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  count: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  frecuencia: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  separator: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
  },
});
