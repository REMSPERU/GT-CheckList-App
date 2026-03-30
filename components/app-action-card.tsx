import { type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface AppActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function AppActionCard({
  icon,
  title,
  description,
  onPress,
  accessibilityLabel,
  containerStyle,
}: AppActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        containerStyle,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 78,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.75,
  },
});
