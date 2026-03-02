import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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

// ─── Types ───────────────────────────────────────────────────────────

interface ChecklistItem {
  value: boolean;
  observation: string;
  photo: string | null;
}

type MaintenanceType = 'conventional' | 'conductive-cement' | null;

interface GroundingWellSession {
  preMeasurement: string;
  preMeasurementPhoto: string | null;
  greaseApplicationPhoto: string | null;
  maintenanceType: MaintenanceType;
  thorGelPhoto: string | null;
  postMeasurement: string;
  postMeasurementPhoto: string | null;
  generalObservation: string;
  lidStatus: 'good' | 'bad' | null;
  lidStatusObservation: string;
  lidStatusPhoto: string | null;
  hasSignage: ChecklistItem;
  connectorsOk: ChecklistItem;
  hasAccess: ChecklistItem;
}

type DirectPhotoKey =
  | 'lidStatus'
  | 'preMeasurement'
  | 'greaseApplication'
  | 'thorGel'
  | 'postMeasurement';

// ─── Constants ───────────────────────────────────────────────────────

const COLORS = {
  primary: '#0891B2',
  primaryLight: '#E0F7FA',
  primarySoft: '#B2EBF2',
  accent: '#06B6D4',
  bg: '#F9FAFB',
  white: '#FFFFFF',
  text: '#11181C',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  success: '#10B981',
  error: '#EF4444',
} as const;

const defaultItem: ChecklistItem = {
  value: true,
  observation: '',
  photo: null,
};

const defaultSession: GroundingWellSession = {
  preMeasurement: '',
  preMeasurementPhoto: null,
  greaseApplicationPhoto: null,
  maintenanceType: null,
  thorGelPhoto: null,
  postMeasurement: '',
  postMeasurementPhoto: null,
  generalObservation: '',
  lidStatus: 'good',
  lidStatusObservation: '',
  lidStatusPhoto: null,
  hasSignage: { ...defaultItem },
  connectorsOk: { ...defaultItem },
  hasAccess: { ...defaultItem },
};

// ─── Memoized Sub-Components ─────────────────────────────────────────

interface PhotoButtonProps {
  onPress: () => void;
  hasPhoto: boolean;
  compact?: boolean;
}

const PhotoButton = memo(function PhotoButton({
  onPress,
  hasPhoto,
  compact,
}: PhotoButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.photoButton, compact && styles.photoButtonCompact]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Ionicons
        name="camera-outline"
        size={compact ? 16 : 18}
        color={COLORS.primary}
      />
      <Text
        style={[
          styles.photoButtonText,
          compact && styles.photoButtonTextCompact,
        ]}>
        {hasPhoto ? 'Cambiar foto' : 'Tomar foto'}
      </Text>
    </TouchableOpacity>
  );
});

interface PhotoThumbnailProps {
  uri: string;
}

const PhotoThumbnail = memo(function PhotoThumbnail({
  uri,
}: PhotoThumbnailProps) {
  return <Image source={{ uri }} style={styles.thumbnail} />;
});

interface TypeOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const TypeOption = memo(function TypeOption({
  label,
  selected,
  onPress,
}: TypeOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.typeButton, selected && styles.typeButtonSelected]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text
        style={[
          styles.typeButtonText,
          selected && styles.typeButtonTextSelected,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ─── Main Component ──────────────────────────────────────────────────

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

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Se necesita acceso a la cámara para tomar fotos.',
      );
    }
  }, []);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  const updateData = useCallback((updates: Partial<GroundingWellSession>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const takePhoto = useCallback(
    async (itemKey: keyof GroundingWellSession | DirectPhotoKey) => {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        allowsEditing: false,
        aspect: [4, 3],
      });
      if (result.canceled) return;

      const uri = result.assets[0].uri;
      const directPhotoMap: Record<DirectPhotoKey, string> = {
        lidStatus: 'lidStatusPhoto',
        preMeasurement: 'preMeasurementPhoto',
        greaseApplication: 'greaseApplicationPhoto',
        thorGel: 'thorGelPhoto',
        postMeasurement: 'postMeasurementPhoto',
      };

      const photoField = directPhotoMap[itemKey as DirectPhotoKey];
      if (photoField) {
        setData(prev => ({ ...prev, [photoField]: uri }));
      } else {
        const checklistKey = itemKey as
          | 'hasSignage'
          | 'connectorsOk'
          | 'hasAccess';
        setData(prev => {
          const item = prev[checklistKey];
          return { ...prev, [checklistKey]: { ...item, photo: uri } };
        });
      }
    },
    [],
  );

  const checklistKeys = useMemo<(keyof GroundingWellSession)[]>(
    () => ['hasSignage', 'connectorsOk', 'hasAccess'],
    [],
  );

  const handleContinue = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'No se ha podido identificar al usuario.');
      return;
    }

    // Validaciones nuevos campos
    const requiredChecks: [boolean, string][] = [
      [
        !data.preMeasurement.trim(),
        'Ingrese la medición pre-mantenimiento (ohmios).',
      ],
      [
        !data.preMeasurementPhoto,
        'Tome una foto de la medición pre-mantenimiento.',
      ],
      [
        !data.greaseApplicationPhoto,
        'Tome una foto de la aplicación de grasa.',
      ],
      [!data.maintenanceType, 'Seleccione el tipo de mantenimiento.'],
      [
        data.maintenanceType === 'conventional' && !data.thorGelPhoto,
        'Tome una foto de la aplicación de Thor Gel.',
      ],
      [
        !data.postMeasurement.trim(),
        'Ingrese la medición post-mantenimiento (ohmios).',
      ],
      [
        !data.postMeasurementPhoto,
        'Tome una foto de la medición post-mantenimiento.',
      ],
      [data.lidStatus === null, 'Seleccione el estado de la tapa.'],
      [
        data.lidStatus === 'bad' && !data.lidStatusObservation,
        'Ingrese una observación para el estado de la tapa.',
      ],
      [
        data.lidStatus === 'bad' && !data.lidStatusPhoto,
        'Tome una foto para el estado de la tapa.',
      ],
    ];

    for (const [condition, message] of requiredChecks) {
      if (condition) {
        Alert.alert('Campo requerido', message);
        return;
      }
    }

    for (const key of checklistKeys) {
      const item = data[key] as ChecklistItem;
      if (!item.value) {
        if (!item.observation) {
          Alert.alert(
            'Campo requerido',
            `Ingrese una observación para "${key}".`,
          );
          return;
        }
        if (!item.photo) {
          Alert.alert('Campo requerido', `Tome una foto para "${key}".`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const photosToSave: { uri: string; itemKey: string }[] = [];
      const dataToSave = JSON.parse(JSON.stringify(data));

      // Recolectar fotos directas
      const directPhotos: [string, string][] = [
        ['preMeasurementPhoto', 'preMeasurement'],
        ['greaseApplicationPhoto', 'greaseApplication'],
        ['thorGelPhoto', 'thorGel'],
        ['postMeasurementPhoto', 'postMeasurement'],
        ['lidStatusPhoto', 'lidStatus'],
      ];
      for (const [field, itemKey] of directPhotos) {
        if (dataToSave[field]) {
          photosToSave.push({ uri: dataToSave[field], itemKey });
          dataToSave[field] = null;
        }
      }

      // Recolectar fotos de checklist items
      for (const key of checklistKeys) {
        const item = dataToSave[key] as ChecklistItem;
        if (item.photo) {
          photosToSave.push({ uri: item.photo, itemKey: key as string });
          item.photo = null;
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
  }, [data, user, panelId, maintenanceId, checklistKeys, router]);

  // ─── Render Helpers ──────────────────────────────────────────────

  const renderToggleItem = useCallback(
    (label: string, itemKey: keyof GroundingWellSession, iconName: string) => {
      const item = data[itemKey] as ChecklistItem;
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={16}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.labelSmall}>{label}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text
                style={[
                  styles.statusBadge,
                  item.value ? styles.statusBadgeOk : styles.statusBadgeBad,
                ]}>
                {item.value ? 'Sí' : 'No'}
              </Text>
              <Switch
                value={item.value}
                onValueChange={value =>
                  updateData({ [itemKey]: { ...item, value } })
                }
                trackColor={{ false: '#E5E7EB', true: COLORS.primarySoft }}
                thumbColor={item.value ? COLORS.primary : '#D1D5DB'}
                style={styles.switchSmall}
              />
            </View>
          </View>
          {!item.value && (
            <>
              <TextInput
                style={styles.obsInput}
                placeholder="Ingrese observación..."
                placeholderTextColor={COLORS.textMuted}
                value={item.observation}
                onChangeText={observation =>
                  updateData({ [itemKey]: { ...item, observation } })
                }
                multiline
              />
              <PhotoButton
                onPress={() => takePhoto(itemKey)}
                hasPhoto={!!item.photo}
                compact
              />
              {item.photo && <PhotoThumbnail uri={item.photo} />}
            </>
          )}
        </View>
      );
    },
    [data, updateData, takePhoto],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pozo a Tierra</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ═══ SECCIÓN: Mediciones y Mantenimiento ═══ */}
        <Text style={styles.sectionTitle}>Mediciones y Mantenimiento</Text>

        {/* 1. Medición Pre */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="gauge"
                size={16}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.labelSmall}>
              Medición con Telurómetro{' '}
              <Text style={styles.labelMuted}>(Antes del Mantto)</Text>
            </Text>
          </View>
          <View style={styles.measurementRow}>
            <TextInput
              style={styles.measurementInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              value={data.preMeasurement}
              onChangeText={text => updateData({ preMeasurement: text })}
              keyboardType="numeric"
            />
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>Ω</Text>
            </View>
          </View>
          <PhotoButton
            onPress={() => takePhoto('preMeasurement')}
            hasPhoto={!!data.preMeasurementPhoto}
          />
          {data.preMeasurementPhoto && (
            <PhotoThumbnail uri={data.preMeasurementPhoto} />
          )}
        </View>

        {/* 2. Aplicación de Grasa */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="oil"
                size={16}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.labelSmall}>Aplicación de Grasa</Text>
          </View>
          <PhotoButton
            onPress={() => takePhoto('greaseApplication')}
            hasPhoto={!!data.greaseApplicationPhoto}
          />
          {data.greaseApplicationPhoto && (
            <PhotoThumbnail uri={data.greaseApplicationPhoto} />
          )}
        </View>

        {/* 3. Tipo de Mantenimiento */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="wrench-outline"
                size={16}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.labelSmall}>Tipo de Mantenimiento</Text>
          </View>
          <View style={styles.typeContainer}>
            <TypeOption
              label="Convencional"
              selected={data.maintenanceType === 'conventional'}
              onPress={() => updateData({ maintenanceType: 'conventional' })}
            />
            <TypeOption
              label="Cemento Conductivo"
              selected={data.maintenanceType === 'conductive-cement'}
              onPress={() =>
                updateData({
                  maintenanceType: 'conductive-cement',
                  thorGelPhoto: null,
                })
              }
            />
          </View>
        </View>

        {/* 3a. Thor Gel (solo convencional) */}
        {data.maintenanceType === 'conventional' && (
          <View style={styles.card}>
            <View style={styles.labelRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="flash-outline"
                  size={16}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.labelSmall}>Aplicación de Thor Gel</Text>
            </View>
            <PhotoButton
              onPress={() => takePhoto('thorGel')}
              hasPhoto={!!data.thorGelPhoto}
            />
            {data.thorGelPhoto && <PhotoThumbnail uri={data.thorGelPhoto} />}
          </View>
        )}

        {/* 4. Medición Post */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="gauge"
                size={16}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.labelSmall}>
              Medición con Telurómetro{' '}
              <Text style={styles.labelMuted}>(Después del Mantto)</Text>
            </Text>
          </View>
          <View style={styles.measurementRow}>
            <TextInput
              style={styles.measurementInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              value={data.postMeasurement}
              onChangeText={text => updateData({ postMeasurement: text })}
              keyboardType="numeric"
            />
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>Ω</Text>
            </View>
          </View>
          <PhotoButton
            onPress={() => takePhoto('postMeasurement')}
            hasPhoto={!!data.postMeasurementPhoto}
          />
          {data.postMeasurementPhoto && (
            <PhotoThumbnail uri={data.postMeasurementPhoto} />
          )}
        </View>

        {/* 5. Observación General */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="text-box-outline"
                size={16}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.labelSmall}>
              Observación General{' '}
              <Text style={styles.labelMuted}>(opcional)</Text>
            </Text>
          </View>
          <TextInput
            style={[styles.obsInput, { minHeight: 70 }]}
            placeholder="Descripción u observación..."
            placeholderTextColor={COLORS.textMuted}
            value={data.generalObservation}
            onChangeText={text => updateData({ generalObservation: text })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ═══ SECCIÓN: Inspección del Pozo ═══ */}
        <Text style={styles.sectionTitle}>Inspección del Pozo</Text>

        {/* Estado de la Tapa */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.labelRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name="layers-outline"
                  size={16}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.labelSmall}>Estado de la Tapa</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text
                style={[
                  styles.statusBadge,
                  data.lidStatus === 'good'
                    ? styles.statusBadgeOk
                    : styles.statusBadgeBad,
                ]}>
                {data.lidStatus === 'good' ? 'Bueno' : 'Malo'}
              </Text>
              <Switch
                value={data.lidStatus === 'good'}
                onValueChange={value =>
                  updateData({ lidStatus: value ? 'good' : 'bad' })
                }
                trackColor={{ false: '#E5E7EB', true: COLORS.primarySoft }}
                thumbColor={
                  data.lidStatus === 'good' ? COLORS.primary : '#D1D5DB'
                }
                style={styles.switchSmall}
              />
            </View>
          </View>
          {data.lidStatus === 'bad' && (
            <>
              <TextInput
                style={styles.obsInput}
                placeholder="Ingrese observación..."
                placeholderTextColor={COLORS.textMuted}
                value={data.lidStatusObservation}
                onChangeText={text =>
                  updateData({ lidStatusObservation: text })
                }
                multiline
              />
              <PhotoButton
                onPress={() => takePhoto('lidStatus')}
                hasPhoto={!!data.lidStatusPhoto}
                compact
              />
              {data.lidStatusPhoto && (
                <PhotoThumbnail uri={data.lidStatusPhoto} />
              )}
            </>
          )}
        </View>

        {renderToggleItem('Señalética Numérica', 'hasSignage', 'numeric')}
        {renderToggleItem(
          'Conectores en Buen Estado',
          'connectorsOk',
          'power-plug',
        )}
        {renderToggleItem('Acceso Disponible', 'hasAccess', 'door-open')}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.8}>
          <Text style={styles.continueBtnText}>Guardar y Continuar</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  // Content
  content: { flex: 1, backgroundColor: COLORS.bg },
  contentContainer: { padding: 14 },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
    marginLeft: 2,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Labels
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 6,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  labelSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  labelMuted: {
    fontWeight: '400',
    color: COLORS.textMuted,
    fontSize: 12,
  },

  // Status badge
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statusBadgeOk: {
    backgroundColor: '#ECFDF5',
    color: COLORS.success,
  },
  statusBadgeBad: {
    backgroundColor: '#FEF2F2',
    color: COLORS.error,
  },
  switchSmall: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // Measurement
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  measurementInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.borderLight,
  },
  unitBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  unitBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Type selector
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.borderLight,
  },
  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  typeButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Photo button (soft outline style)
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    backgroundColor: COLORS.primaryLight,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  photoButtonCompact: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  photoButtonTextCompact: {
    fontSize: 12,
  },

  // Observation
  obsInput: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: COLORS.borderLight,
  },

  // Thumbnail
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },

  // Footer
  footer: {
    padding: 14,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  continueBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
