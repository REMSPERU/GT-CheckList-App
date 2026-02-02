import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { DefaultHeader } from '@/components/default-header';
import {
  supabaseUserService,
  UserProfile,
} from '@/services/supabase-user.service';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import { UserRole } from '@/contexts/UserRoleContext';

const UserCard = ({
  user,
  onPress,
}: {
  user: UserProfile;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.cardAvatar}>
      <Feather name="user" size={24} color="#4B5563" />
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle}>
        {user.first_name || user.last_name
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
          : user.username || 'Usuario sin nombre'}
      </Text>
      <Text style={styles.cardSubtitle}>{user.email}</Text>
    </View>
    <View style={styles.cardRole}>
      <Text style={styles.roleText}>{user.role}</Text>
    </View>
  </TouchableOpacity>
);

export default function AssignRolesScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const userList = await supabaseUserService.listUsers();
      setUsers(userList);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, []),
  );

  const openRoleModal = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setModalVisible(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      await supabaseUserService.updateUserRole(selectedUser.id, selectedRole);
      setModalVisible(false);
      Alert.alert('Éxito', 'El rol del usuario ha sido actualizado.');
      fetchUsers(); // Refresh list
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Ocurrió un error';
      Alert.alert('Error', `No se pudo actualizar el rol: ${errorMessage}`);
    }
  };

  const roleOptions = [
    { label: 'Técnico', value: 'TECNICO' },
    { label: 'Supervisor', value: 'SUPERVISOR' },
    { label: 'Super Admin', value: 'SUPERADMIN' },
  ];

  if (loading && users.length === 0) {
    return (
      <View style={styles.container}>
        <DefaultHeader title="Asignar Roles" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0891B2" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DefaultHeader title="Asignar Roles" />
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <UserCard user={item} onPress={() => openRoleModal(item)} />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No se encontraron usuarios.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchUsers}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Cambiar Rol de {selectedUser?.username}
            </Text>
            <RNPickerSelect
              onValueChange={value => setSelectedRole(value)}
              items={roleOptions}
              value={selectedRole}
              style={pickerSelectStyles}
              placeholder={{ label: 'Seleccionar un rol...', value: null }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleUpdateRole}>
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardAvatar: {
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardRole: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2F7',
  },
  roleText: {
    color: '#0891B2',
    fontWeight: '500',
    fontSize: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#6B7280',
  },
  buttonSave: {
    backgroundColor: '#0891B2',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30,
    width: '100%',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: 'purple',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    width: '100%',
  },
});
