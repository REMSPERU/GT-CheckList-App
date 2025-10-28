import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import OptionCard from "@/components/option-card";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from '@expo/vector-icons';
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import { useRouter } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'column',
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
  sectionTitleWrapper: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  optionsWrapper: {
    gap: 24,
    marginBottom: 24,
  },
  optionCardContainer: {
    position: 'relative',
    width: 342,
    height: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#171a1f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    marginLeft: 'auto',
    marginRight: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
});

function HomeScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const options = [{
    icon: <Octicons name="checklist" size={24} color={iconColor} />,
    title: 'Check Lists',
  }, {
    icon: <MaterialIcons name="home-repair-service" size={24} color={iconColor} />,
    title: 'Mantenimiento Preventivo',
  },
  {
    icon: <MaterialIcons name="home-repair-service" size={24} color={iconColor} />,
    title: 'Mantenimiento Correctivo',
  },
  {
    icon: <Feather name="file-text" size={24} color={iconColor} />,
    title: 'Ficha Técnica',
  }];

  return (
    <View style={styles.container}>
      {/* Header with user info */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcome}>Bienvenido,</Text>
          <Text style={styles.username}>{user?.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#0a7ea4" />
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionTitleWrapper}>
        <Text style={styles.sectionTitle}>¿Qué necesita hacer?</Text>
      </View>

      <View style={styles.optionsWrapper}>
        <View style={styles.optionCardContainer}>
          <Octicons name="checklist" size={32} color="#06B6D4" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 4 }}>Checklist</Text>
            <Text style={{ color: '#4B5563', fontSize: 14 }}>Gestione sus tareas de inspección</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </View>
        <View style={styles.optionCardContainer}>
          <MaterialIcons name="home-repair-service" size={32} color="#06B6D4" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 4 }}>Mantenimiento correctivo</Text>
            <Text style={{ color: '#4B5563', fontSize: 14 }}>Registre y resuelva los problemas inmediato del equipo</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </View>
        <View style={styles.optionCardContainer}>
          <MaterialIcons name="home-repair-service" size={32} color="#06B6D4" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 4 }}>Mantenimiento preventivo</Text>
            <Text style={{ color: '#4B5563', fontSize: 14 }}>Registre sus revisiones de rutina</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </View>
        <View style={styles.optionCardContainer}>
          <Feather name="file-text" size={32} color="#06B6D4" style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 4 }}>Ficha técnica</Text>
            <Text style={{ color: '#4B5563', fontSize: 14 }}>Accese al historial de los equipo</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Rol: {user?.role} • v1.0.0</Text>
      </View>
    </View>
  );
//
}

export default HomeScreen;
