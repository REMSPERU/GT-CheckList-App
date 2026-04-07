import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PropertyResponse as Property } from '@/types/api';

interface BuildingHeroCardProps {
  building: Property | null;
  onPress: () => void;
}

export function BuildingHeroCard({ building, onPress }: BuildingHeroCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir selector de inmueble">
      {building?.image_url ? (
        <Image
          source={{ uri: building.image_url }}
          style={styles.backgroundImage}
          contentFit="cover"
          cachePolicy="disk"
          transition={250}
        />
      ) : (
        <View style={styles.placeholderBackground} />
      )}

      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.badge}>
          <Ionicons name="business-outline" size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>Inmueble activo</Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {building?.name || 'Seleccionar inmueble'}
        </Text>

        <Text style={styles.subtitle} numberOfLines={2}>
          {building?.address ||
            'Selecciona un inmueble para personalizar las acciones del inicio.'}
        </Text>
      </View>

      <View style={styles.chevronWrap}>
        <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E7490',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  content: {
    zIndex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    marginTop: 6,
  },
  chevronWrap: {
    zIndex: 1,
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.86,
  },
});
