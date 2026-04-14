import { View, Text, StyleSheet, ScrollView } from 'react-native';
import React from 'react';
import { useRouter, type Href } from 'expo-router';
import DefaultHeader from '@/components/default-header';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppActionCard } from '@/components/app-action-card';

interface AdminOptionItem {
  href: Href;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}

export default function AdminScreen() {
  const router = useRouter();

  const options: AdminOptionItem[] = [
    {
      href: '/admin/add-property',
      title: 'Añadir Inmueble',
      description: 'Registra nuevos inmuebles operativos',
      icon: 'plus-circle',
    },
    {
      href: '/admin/assign-roles',
      title: 'Asignar Roles de Usuario',
      description: 'Define permisos por tipo de usuario',
      icon: 'users',
    },
    {
      href: '/admin/assign-providers',
      title: 'Asignar Proveedores',
      description: 'Relaciona proveedores con inmuebles',
      icon: 'briefcase',
    },
    {
      href: '/admin/assign-auditor-properties',
      title: 'Asignar Auditor a Inmueble',
      description: 'Guarda asignaciones en user_properties',
      icon: 'map-pin',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <DefaultHeader title="Administración" />
      <ScrollView
        contentContainerStyle={styles.optionsContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Panel de configuracion</Text>
          <Text style={styles.introText}>
            Gestione inmuebles, roles y asignaciones clave del sistema.
          </Text>
        </View>

        {options.map(option => (
          <AppActionCard
            key={option.title}
            title={option.title}
            description={option.description}
            icon={<Feather name={option.icon} size={20} color="#0891B2" />}
            onPress={() => router.push(option.href)}
            containerStyle={styles.optionCard}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  optionsContainer: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
    width: '100%',
  },
  introCard: {
    backgroundColor: '#ECFEFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    padding: 14,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  introText: {
    marginTop: 4,
    color: '#155E75',
    fontSize: 13,
  },
  optionCard: {
    width: '100%',
    borderColor: '#E6EEF2',
  },
});
