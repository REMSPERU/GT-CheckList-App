import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { translateUbicacion } from '@/types/inventory';

interface UbicacionLabelProps {
  ubicacion: string | null | undefined;
  detalleUbicacion?: string | null;
  iconColor?: string;
  textStyle?: object;
}

/**
 * Renders a location label with proper Spanish translation.
 * AZOTEA, SEMISOTANO, Piso X, Sótano Y.
 */
export const UbicacionLabel = memo(function UbicacionLabel({
  ubicacion,
  detalleUbicacion,
  iconColor = '#64748B',
  textStyle,
}: UbicacionLabelProps) {
  const label = translateUbicacion(ubicacion);
  const hasDetalle = detalleUbicacion && detalleUbicacion.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Ionicons name="location-outline" size={14} color={iconColor} />
      <Text style={[styles.text, textStyle]} numberOfLines={2}>
        {label}
        {hasDetalle ? ` · ${detalleUbicacion}` : ''}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
});
