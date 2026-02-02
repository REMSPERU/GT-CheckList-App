import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { Link } from 'expo-router';
import { DefaultHeader } from '@/components/default-header';
import { Feather } from '@expo/vector-icons';

const AdminOption = ({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
}) => (
  <Link href={href} asChild>
    <TouchableOpacity style={styles.option}>
      <Feather name={icon} size={24} color="#0891B2" />
      <Text style={styles.optionText}>{title}</Text>
      <Feather name="chevron-right" size={24} color="#9CA3AF" />
    </TouchableOpacity>
  </Link>
);

export default function AdminScreen() {
  return (
    <View style={styles.container}>
      <DefaultHeader title="Administración" />
      <View style={styles.optionsContainer}>
        <AdminOption
          href="/(tabs)/admin/add-property"
          title="Añadir Inmueble"
          icon="plus-circle"
        />
        <AdminOption
          href="/(tabs)/admin/assign-roles"
          title="Asignar Roles de Usuario"
          icon="users"
        />
        <AdminOption
          href="/(tabs)/admin/assign-providers"
          title="Asignar Proveedores"
          icon="briefcase"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  optionsContainer: {
    padding: 16,
    gap: 12,
  },
  option: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
