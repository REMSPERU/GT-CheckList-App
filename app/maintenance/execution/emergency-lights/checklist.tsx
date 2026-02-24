import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const STORAGE_KEY_PREFIX = 'emergency_light_session_';

interface ChecklistItemData {
  status: boolean; // true = OK, false = Obs
  observation: string;
  photoUri?: string;
}

interface EmergencyLightSession {
  lumenes: string;
  lumenesItem: ChecklistItemData;
  tiempoDuracion: string;
  tiempoDuracionItem: ChecklistItemData;
  switchItem: ChecklistItemData;
  conectadoTomacorrienteItem: ChecklistItemData;
  conexionDirectaItem: ChecklistItemData;
  conectadoCircuitoIluminacionItem: ChecklistItemData;
}

const defaultItemData: ChecklistItemData = {
  status: true,
  observation: '',
  photoUri: undefined,
};

const defaultSession: EmergencyLightSession = {
  lumenes: '',
  lumenesItem: { ...defaultItemData },
  tiempoDuracion: '',
  tiempoDuracionItem: { ...defaultItemData },
  switchItem: { ...defaultItemData },
  conectadoTomacorrienteItem: { ...defaultItemData },
  conexionDirectaItem: { ...defaultItemData },
  conectadoCircuitoIluminacionItem: { ...defaultItemData },
};

export default function EmergencyLightsChecklistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId?: string;
    equipmentType?: string;
  }>();

  const { panelId, maintenanceId } = params;
  const sessionKey = `${STORAGE_KEY_PREFIX}${panelId}_${maintenanceId || 'adhoc'}`;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmergencyLightSession>(defaultSession);

  // Load session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(sessionKey);
        if (stored) {
          setData({ ...defaultSession, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.error('Error loading emergency light session:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [sessionKey]);

  // Save session on change
  const updateData = async (updates: Partial<EmergencyLightSession>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    try {
      await AsyncStorage.setItem(sessionKey, JSON.stringify(newData));
    } catch (e) {
      console.error('Error saving emergency light session:', e);
    }
  };

  const updateItem = async (
    itemKey: keyof EmergencyLightSession,
    updates: Partial<ChecklistItemData>,
  ) => {
    const currentItem = data[itemKey] as ChecklistItemData;
    const newItem = { ...currentItem, ...updates };
    updateData({ [itemKey]: newItem } as Partial<EmergencyLightSession>);
  };

  const handleTakePhoto = async (itemKey: keyof EmergencyLightSession) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets.length > 0) {
        updateItem(itemKey, { photoUri: result.assets[0].uri });
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  const handleRemovePhoto = (itemKey: keyof EmergencyLightSession) => {
    updateItem(itemKey, { photoUri: undefined });
  };

  const handleContinue = () => {
    // Validate required fields
    if (!data.lumenes.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingrese el valor de Lumenes');
      return;
    }
    // Only validate tiempoDuracion if we allowed the user to input it
    // Actually as we removed the input, what happens to it? It'll be empty. We can skip this validation if the status is checked or not since its handled via observation.

    // Validate observations
    const items = [
      { key: 'lumenesItem', label: 'Lumenes' },
      { key: 'tiempoDuracionItem', label: 'Tiempo de duración' },
      { key: 'switchItem', label: 'Switch' },
      { key: 'conectadoTomacorrienteItem', label: 'Conectado a Tomacorriente' },
      { key: 'conexionDirectaItem', label: 'Conexión directa' },
      {
        key: 'conectadoCircuitoIluminacionItem',
        label: 'Conectado al circuito de iluminación',
      },
    ];

    for (const item of items) {
      const itemData = data[
        item.key as keyof EmergencyLightSession
      ] as ChecklistItemData;
      if (!itemData.status) {
        if (!itemData.observation?.trim()) {
          Alert.alert(
            'Observación incompleta',
            `Por favor ingrese una observación para "${item.label}"`,
          );
          return;
        }
        if (!itemData.photoUri) {
          Alert.alert(
            'Foto incompleta',
            `Por favor tome una foto para la observación de "${item.label}"`,
          );
          return;
        }
      }
    }

    router.push({
      pathname: '/maintenance/execution/emergency-lights/summary',
      params: { panelId, maintenanceId },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  const renderMeasurementItem = (
    label: string,
    icon: React.ReactNode,
    value: string,
    onChangeValue: (val: string) => void,
    itemKey: keyof EmergencyLightSession,
    placeholder: string,
    unit?: string,
    trueLabel: string = 'Si',
    falseLabel: string = 'No',
    showInput: boolean = true,
  ) => {
    const item = data[itemKey] as ChecklistItemData;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.labelRow}>
            {icon}
            <Text style={styles.label}>{label}</Text>
          </View>
          {showInput && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.measureInput}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={value}
                onChangeText={onChangeValue}
              />
              {unit && <Text style={styles.unitText}>{unit}</Text>}
            </View>
          )}
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                item.status && styles.statusTextActive,
              ]}>
              {item.status ? trueLabel : falseLabel}
            </Text>
            <Switch
              value={item.status}
              onValueChange={val => updateItem(itemKey, { status: val })}
              trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
              thumbColor="#fff"
            />
          </View>
        </View>
        {!item.status && (
          <View style={styles.observationContainer}>
            <TextInput
              style={styles.obsInput}
              placeholder="Ingrese observación"
              placeholderTextColor="#9CA3AF"
              value={item.observation}
              onChangeText={val => updateItem(itemKey, { observation: val })}
              multiline
            />
            <View style={styles.photoRow}>
              {item.photoUri ? (
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: item.photoUri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(itemKey)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => handleTakePhoto(itemKey)}
                style={styles.cameraBtn}>
                <Ionicons name="camera-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render a simple toggle item
  const renderToggleItem = (
    label: string,
    icon: React.ReactNode,
    itemKey: keyof EmergencyLightSession,
    trueLabel: string = 'Si',
    falseLabel: string = 'No',
  ) => {
    const item = data[itemKey] as ChecklistItemData;
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
                item.status && styles.statusTextActive,
              ]}>
              {item.status ? trueLabel : falseLabel}
            </Text>
            <Switch
              value={item.status}
              onValueChange={val => updateItem(itemKey, { status: val })}
              trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
              thumbColor="#fff"
            />
          </View>
        </View>
        {!item.status && (
          <View style={styles.observationContainer}>
            <TextInput
              style={styles.obsInput}
              placeholder="Ingrese observación"
              placeholderTextColor="#9CA3AF"
              value={item.observation}
              onChangeText={val => updateItem(itemKey, { observation: val })}
              multiline
            />
            <View style={styles.photoRow}>
              {item.photoUri ? (
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: item.photoUri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(itemKey)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => handleTakePhoto(itemKey)}
                style={styles.cameraBtn}>
                <Ionicons name="camera-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="lightbulb-on" size={20} color="white" />
        </View>
        <Text style={styles.headerTitle}>Luces de emergencia</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lumenes */}
        {renderMeasurementItem(
          'Lumenes',
          <MaterialCommunityIcons
            name="brightness-7"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
          data.lumenes,
          val => updateData({ lumenes: val }),
          'lumenesItem',
          '',
        )}

        {/* Tiempo de duración */}
        {renderMeasurementItem(
          'Tiempo de duración',
          <MaterialIcons
            name="timer"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
          data.tiempoDuracion,
          val => updateData({ tiempoDuracion: val }),
          'tiempoDuracionItem',
          '',
          'Min',
          '>90',
          '<90',
          false, // Ocultar input
        )}

        {/* Switch */}
        {renderToggleItem(
          'Switch',
          <MaterialCommunityIcons
            name="toggle-switch"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
          'switchItem',
          'No',
          'Si',
        )}

        {/* Conectado a Tomacorriente */}
        {renderToggleItem(
          'Conectado a Tomacorriente',
          <MaterialCommunityIcons
            name="power-plug"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
          'conectadoTomacorrienteItem',
          'No',
          'Si',
        )}

        {/* Conexión directa */}
        {renderToggleItem(
          'Conexión directa',
          <MaterialCommunityIcons
            name="cable-data"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
          'conexionDirectaItem',
        )}

        {/* Conectado al circuito de iluminación */}
        {renderToggleItem(
          'Conectado al circuito de iluminación',
          <MaterialCommunityIcons
            name="lightning-bolt"
            size={20}
            color="#0891B2"
            style={styles.icon}
          />,
          'conectadoCircuitoIluminacionItem',
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backBtn: {
    marginRight: 10,
  },
  headerIconContainer: {
    backgroundColor: '#06B6D4',
    padding: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
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
    flexWrap: 'wrap',
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  measureInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#11181C',
    backgroundColor: '#F9FAFB',
    minWidth: 60,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#0891B2',
  },
  observationContainer: {
    marginTop: 12,
    gap: 8,
  },
  obsInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  photoWrapper: {
    position: 'relative',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  cameraBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  continueBtn: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
