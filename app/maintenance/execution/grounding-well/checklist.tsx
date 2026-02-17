import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../../contexts/AuthContext';
import { DatabaseService } from '../../../../services/db';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface ChecklistItem {
  value: boolean; // true = Si/Buen estado, false = No/Malo
  observation: string;
  photo: string | null;
}

interface GroundingWellSession {
  lidStatus: 'good' | 'bad' | null;
  lidStatusObservation: string;
  lidStatusPhoto: string | null;
  hasSignage: ChecklistItem;
  connectorsOk: ChecklistItem;
  hasAccess: ChecklistItem;
}

const defaultItem: ChecklistItem = {
  value: true,
  observation: '',
  photo: null,
};

const defaultSession: GroundingWellSession = {
  lidStatus: 'good',
  lidStatusObservation: '',
  lidStatusPhoto: null,
  hasSignage: { ...defaultItem },
  connectorsOk: { ...defaultItem },
  hasAccess: { ...defaultItem },
};

export default function GroundingWellChecklistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId?: string;
  }>();
  const { user } = useAuth();

  const { panelId, maintenanceId } = params;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GroundingWellSession>(defaultSession);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Se necesita acceso a la cámara para tomar fotos.',
      );
    }
  };

  const takePhoto = async (
    itemKey: keyof GroundingWellSession | 'lidStatus',
  ) => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      allowsEditing: false,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (itemKey === 'lidStatus') {
        updateData({ lidStatusPhoto: uri });
      } else {
        const item = data[itemKey] as ChecklistItem;
        updateData({ [itemKey]: { ...item, photo: uri } });
      }
    }
  };

  const updateData = (updates: Partial<GroundingWellSession>) => {
    setData(prevData => ({ ...prevData, ...updates }));
  };

  const handleContinue = async () => {
    if (!user) {
      Alert.alert('Error', 'No se ha podido identificar al usuario.');
      return;
    }
    if (data.lidStatus === null) {
      Alert.alert(
        'Campo requerido',
        'Por favor seleccione el estado de la tapa.',
      );
      return;
    }
    if (data.lidStatus === 'bad') {
      if (!data.lidStatusObservation) {
        Alert.alert(
          'Campo requerido',
          'Por favor ingrese una observación para el estado de la tapa.',
        );
        return;
      }
      if (!data.lidStatusPhoto) {
        Alert.alert(
          'Campo requerido',
          'Por favor tome una foto para el estado de la tapa.',
        );
        return;
      }
    }

    const checklistItems: (keyof GroundingWellSession)[] = [
      'hasSignage',
      'connectorsOk',
      'hasAccess',
    ];
    for (const key of checklistItems) {
      const item = data[key] as ChecklistItem;
      if (!item.value) {
        if (!item.observation) {
          Alert.alert(
            'Campo requerido',
            `Por favor ingrese una observación para "${key}".`,
          );
          return;
        }
        if (!item.photo) {
          Alert.alert(
            'Campo requerido',
            `Por favor tome una foto para "${key}".`,
          );
          return;
        }
      }
    }

    setLoading(true);
    try {
      const photosToSave: { uri: string; itemKey: string }[] = [];
      const dataToSave = JSON.parse(JSON.stringify(data)); // Deep copy

      if (dataToSave.lidStatusPhoto) {
        photosToSave.push({
          uri: dataToSave.lidStatusPhoto,
          itemKey: 'lidStatus',
        });
        dataToSave.lidStatusPhoto = null; // Null out local URI in checklist data
      }

      for (const key of checklistItems) {
        const item = dataToSave[key] as ChecklistItem;
        if (item.photo) {
          photosToSave.push({
            uri: item.photo,
            itemKey: key as string,
          });
          item.photo = null; // Null out local URI in checklist data
        }
      }

      await DatabaseService.saveOfflineGroundingWellChecklist(
        panelId,
        maintenanceId || null,
        dataToSave,
        user.id,
        photosToSave,
      );
      Alert.alert(
        'Guardado',
        'Los datos del checklist han sido guardados localmente.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      console.error('Error saving grounding well checklist:', error);
      Alert.alert(
        'Error',
        'No se pudo guardar el checklist. Intente de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  const renderToggleItem = (
    label: string,
    itemKey: keyof GroundingWellSession,
    icon: React.ReactNode,
  ) => {
    const item = data[itemKey] as ChecklistItem;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.labelRow}>
            {icon}
            <Text style={styles.label}>{label}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                item.value && styles.statusTextActive,
              ]}>
              {item.value ? 'Sí' : 'No'}
            </Text>
            <Switch
              value={item.value}
              onValueChange={value =>
                updateData({ [itemKey]: { ...item, value } })
              }
              trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
              thumbColor="#fff"
            />
          </View>
        </View>
        {!item.value && (
          <>
            <TextInput
              style={styles.obsInput}
              placeholder="Ingrese observación"
              value={item.observation}
              onChangeText={observation =>
                updateData({ [itemKey]: { ...item, observation } })
              }
              multiline
            />
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => takePhoto(itemKey)}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.photoButtonText}>Tomar Foto</Text>
            </TouchableOpacity>
            {item.photo && (
              <Image source={{ uri: item.photo }} style={styles.thumbnail} />
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checklist de Pozo a Tierra</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Estado de la Tapa */}
        {/* Estado de la Tapa */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={20}
                color="#0891B2"
                style={styles.icon}
              />
              <Text style={styles.label}>Estado de la Tapa</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text
                style={[
                  styles.statusText,
                  data.lidStatus === 'good' && styles.statusTextActive,
                ]}>
                {data.lidStatus === 'good' ? 'Bueno' : 'Malo'}
              </Text>
              <Switch
                value={data.lidStatus === 'good'}
                onValueChange={value =>
                  updateData({ lidStatus: value ? 'good' : 'bad' })
                }
                trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
                thumbColor="#fff"
              />
            </View>
          </View>
          {data.lidStatus === 'bad' && (
            <>
              <TextInput
                style={styles.obsInput}
                placeholder="Ingrese observación para el estado de la tapa"
                value={data.lidStatusObservation}
                onChangeText={text =>
                  updateData({ lidStatusObservation: text })
                }
                multiline
              />
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => takePhoto('lidStatus')}>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.photoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>
              {data.lidStatusPhoto && (
                <Image
                  source={{ uri: data.lidStatusPhoto }}
                  style={styles.thumbnail}
                />
              )}
            </>
          )}
        </View>

        {/* Señalética Numérica */}
        {renderToggleItem(
          'Señalética Numérica',
          'hasSignage',
          <MaterialCommunityIcons
            name="numeric"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
        )}

        {/* Conectores en buen estado */}
        {renderToggleItem(
          'Conectores en Buen Estado',
          'connectorsOk',
          <MaterialCommunityIcons
            name="power-plug"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
        )}

        {/* Acceso */}
        {renderToggleItem(
          'Acceso Disponible',
          'hasAccess',
          <MaterialCommunityIcons
            name="door-open"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Guardar y Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#11181C' },
  content: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 10,
  },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 14, color: '#6B7280' },
  statusTextActive: { color: '#0891B2' },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  optionButtonSelected: {
    backgroundColor: '#06B6D4',
  },
  optionButtonText: {
    color: '#06B6D4',
    fontWeight: '600',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  obsInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  continueBtn: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  photoButton: {
    backgroundColor: '#0891B2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
});
