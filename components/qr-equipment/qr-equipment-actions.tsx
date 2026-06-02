import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, Pressable, View } from 'react-native';

import type { QREquipmentAction } from '@/types/qr-equipment';

interface QREquipmentActionsProps {
  actions: QREquipmentAction[];
}

export function QREquipmentActions({ actions }: QREquipmentActionsProps) {
  return (
    <View style={styles.wrapper}>
      {actions.map(action => (
        <Pressable
          key={action.key}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.title}>
          <View style={styles.iconWrap}>
            <MaterialIcons name={action.iconName} size={24} color="#06B6D4" />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>{action.title}</Text>
            <Text style={styles.description}>{action.description}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  card: {
    minHeight: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.78,
  },
});
