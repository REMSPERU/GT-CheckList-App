import { StyleSheet, Text } from 'react-native';

export function EquipmentAccessBadge({ difficult }: { difficult: unknown }) {
  if (difficult !== true) return null;
  return <Text style={styles.badge}>Equipo de difícil acceso</Text>;
}

const styles = StyleSheet.create({
  badge: { color: '#92400E', fontSize: 13, fontWeight: '600', marginTop: 4 },
});
