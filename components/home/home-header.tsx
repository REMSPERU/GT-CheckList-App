import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface HomeHeaderProps {
  username: string;
  onAccountPress: () => void;
  onLogoutPress: () => void;
}

function formatUsername(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return 'Usuario';

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function HomeHeader({
  username,
  onAccountPress,
  onLogoutPress,
}: HomeHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const formattedUsername = formatUsername(username);

  const handleAccountPress = () => {
    setIsMenuOpen(false);
    onAccountPress();
  };

  const handleLogoutPress = () => {
    setIsMenuOpen(false);
    onLogoutPress();
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
            <Text style={styles.welcome}>Bienvenido, </Text>
            <Text style={styles.username}>{formattedUsername}</Text>
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}
            onPress={() => setIsMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menu de cuenta"
            hitSlop={10}>
            <Ionicons name="ellipsis-vertical" size={18} color="#1F2937" />
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setIsMenuOpen(false)}
          accessibilityLabel="Cerrar menu"
        />

        <View style={styles.menuContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={handleAccountPress}
            accessibilityRole="button"
            accessibilityLabel="Cambiar contrasena">
            <Ionicons name="key-outline" size={18} color="#1F2937" />
            <Text style={styles.menuItemText}>Cambiar contrasena</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={handleLogoutPress}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesion">
            <Ionicons name="log-out-outline" size={18} color="#B91C1C" />
            <Text style={styles.logoutMenuItemText}>Cerrar sesion</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '82%',
  },
  greeting: {
    fontSize: 20,
    color: '#11181C',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.12)',
  },
  menuContainer: {
    position: 'absolute',
    top: 78,
    right: 20,
    width: 220,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#11181C',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  menuItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  menuItemText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  logoutMenuItemText: {
    fontSize: 15,
    color: '#B91C1C',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  welcome: {
    fontSize: 18,
    color: '#6B7280',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C',
  },
  pressed: {
    opacity: 0.75,
  },
});
