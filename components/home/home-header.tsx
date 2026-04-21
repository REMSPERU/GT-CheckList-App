import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface HomeHeaderProps {
  username: string;
  onChangePasswordPress: () => void;
  onLogoutPress: () => void;
}

export function HomeHeader({
  username,
  onChangePasswordPress,
  onLogoutPress,
}: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <Text style={styles.welcome}>Bienvenido,</Text>
        <Text style={styles.username}>{username}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}
          onPress={onChangePasswordPress}
          accessibilityRole="button"
          accessibilityLabel="Cambiar contrasena">
          <Ionicons name="key-outline" size={16} color="#0a7ea4" />
          <Text style={styles.changeText}>Clave</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={onLogoutPress}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesion">
          <Ionicons name="log-out-outline" size={18} color="#0a7ea4" />
          <Text style={styles.logoutText}>Salir</Text>
        </Pressable>
      </View>
    </View>
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
    flexDirection: 'column',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeText: {
    color: '#0a7ea4',
    marginLeft: 6,
    fontWeight: '600',
  },
  welcome: {
    fontSize: 16,
    color: '#6B7280',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#11181C',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#0a7ea4',
    marginLeft: 6,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
