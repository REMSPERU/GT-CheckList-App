import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EquipmentStatusBadgeProps {
  estatus: string | null | undefined;
}

/**
 * Badge de estado del equipo: verde ACTIVO, rojo INACTIVO, gris para otros.
 */
export const EquipmentStatusBadge = memo(function EquipmentStatusBadge({
  estatus,
}: EquipmentStatusBadgeProps) {
  const isActivo = estatus === 'ACTIVO';
  const isInactivo = estatus === 'INACTIVO';

  const containerStyle = [
    styles.badge,
    isActivo && styles.badgeActivo,
    isInactivo && styles.badgeInactivo,
    !isActivo && !isInactivo && styles.badgeOther,
  ];

  const textStyle = [
    styles.text,
    isActivo && styles.textActivo,
    isInactivo && styles.textInactivo,
    !isActivo && !isInactivo && styles.textOther,
  ];

  const label = estatus ?? 'DESCONOCIDO';

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.dot,
          isActivo && styles.dotActivo,
          isInactivo && styles.dotInactivo,
          !isActivo && !isInactivo && styles.dotOther,
        ]}
      />
      <Text style={textStyle}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeActivo: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeInactivo: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeOther: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActivo: { backgroundColor: '#16A34A' },
  dotInactivo: { backgroundColor: '#DC2626' },
  dotOther: { backgroundColor: '#94A3B8' },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textActivo: { color: '#15803D' },
  textInactivo: { color: '#B91C1C' },
  textOther: { color: '#64748B' },
});
