import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { DatabaseService } from '@/services/database';
import { PhotoItem } from '@/types/maintenance-session';

export default function PreMaintenancePhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
    // Context
    building?: string;
    maintenanceType?: string;
    propertyId?: string;
    propertyName?: string;
    // Session context for last equipment detection
    sessionTotal?: string;
    sessionCompleted?: string;
    sessionDate?: string;
  }>();
  const panelId = params.panelId;
  const maintenanceId = params.maintenanceId;

  // Deserialize building for context if present
  const buildingData = params.building
    ? JSON.parse(params.building as string)
    : undefined;

  const { session, loading, addPhoto, removePhoto } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
    {
      building: buildingData,
      maintenanceType: params.maintenanceType,
      propertyId: params.propertyId,
      propertyName: params.propertyName,
      // Session context
      sessionTotal: params.sessionTotal
        ? parseInt(params.sessionTotal)
        : undefined,
      sessionCompleted: params.sessionCompleted
        ? parseInt(params.sessionCompleted)
        : undefined,
      sessionDate: params.sessionDate,
    },
  );

  // Panel type state for photo requirements
  const [tipoTablero, setTipoTablero] = useState<string>('');
  const [panelLoading, setPanelLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState<
    'panel' | 'thermo' | null
  >(null);

  // Load panel info from local DB
  useEffect(() => {
    const loadPanelInfo = async () => {
      if (!panelId) {
        setPanelLoading(false);
        return;
      }
      try {
        const panel = await DatabaseService.getEquipmentById(panelId);
        if (panel?.equipment_detail?.tipo_tablero) {
          setTipoTablero(panel.equipment_detail.tipo_tablero.toLowerCase());
        }
      } catch (e) {
        console.error('Error loading panel info:', e);
      } finally {
        setPanelLoading(false);
      }
    };
    loadPanelInfo();
  }, [panelId]);

  // Determine maximum photos based on panel type
  const MAX_PHOTOS = tipoTablero === 'distribucion' ? 1 : 2;

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const libraryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted' || libraryStatus.status !== 'granted') {
        // Permissions not granted
      }
    })();
  }, []);

  const openSelectionModal = (section: 'panel' | 'thermo') => {
    // Validate max photos before opening modal
    const currentPhotos =
      session?.prePhotos.filter(p =>
        section === 'panel'
          ? !p.category || p.category === 'visual'
          : p.category === 'thermo',
      ) || [];

    if (currentPhotos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Límite alcanzado',
        `Ya has agregado el máximo de ${MAX_PHOTOS} foto(s) para esta sección.`,
      );
      return;
    }

    setCurrentSection(section);
    setModalVisible(true);
  };

  const handleCamera = async () => {
    setModalVisible(false);
    if (!currentSection) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      handleImageResult(result, currentSection);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handleGallery = async () => {
    setModalVisible(false);
    if (!currentSection) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      handleImageResult(result, currentSection);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleImageResult = async (
    result: ImagePicker.ImagePickerResult,
    section: 'panel' | 'thermo',
  ) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Validate max photos before adding
      const currentPhotos =
        session?.prePhotos.filter(p =>
          section === 'panel'
            ? !p.category || p.category === 'visual'
            : p.category === 'thermo',
        ) || [];

      if (currentPhotos.length >= MAX_PHOTOS) {
        Alert.alert(
          'Límite alcanzado',
          `Ya has agregado el máximo de ${MAX_PHOTOS} foto(s) para esta sección.`,
        );
        return;
      }

      const asset = result.assets[0];
      const newPhoto: PhotoItem = {
        id: asset.uri, // Using URI as ID for now
        uri: asset.uri,
        status: 'pending', // Will be uploaded later
        category: section === 'panel' ? 'visual' : 'thermo',
      };

      // Add to PRE photos
      addPhoto('pre', newPhoto);
    }
  };

  const handleRemoveItem = (id: string) => {
    removePhoto('pre', id);
  };

  const handleContinue = () => {
    // Navigate to instrument selection
    router.push({
      pathname:
        '/maintenance/execution/electrical-panel/select-instrument' as any,
      params: {
        panelId: panelId,
        maintenanceId: maintenanceId,
      },
    });
  };

  if (loading || panelLoading || !session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={{ marginTop: 10 }}>Cargando sesión...</Text>
      </View>
    );
  }

  // Filter photos for display
  const panelPhotos = session.prePhotos.filter(
    p => !p.category || p.category === 'visual',
  );
  const thermoPhotos = session.prePhotos.filter(p => p.category === 'thermo');

  // Validation - panel photos required, thermo only if 'autosoportado'
  const isThermoRequired = tipoTablero === 'autosoportado';
  const isFormValid =
    panelPhotos.length >= 1 && (!isThermoRequired || thermoPhotos.length >= 1);

  const PhotoBoxSection = ({
    title,
    photos,
    section,
  }: {
    title: string;
    photos: PhotoItem[];
    section: 'panel' | 'thermo';
  }) => {
    const count = photos.length;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {count >= 1 && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.counterContainer}>
            <View
              style={[
                styles.countBadge,
                count >= 1
                  ? styles.countBadgeSuccess
                  : styles.countBadgePending,
              ]}>
              <Text
                style={[
                  styles.countBadgeText,
                  count >= 1
                    ? styles.countTextSuccess
                    : styles.countTextPending,
                ]}>
                {count}
              </Text>
            </View>
            <View style={styles.limitsContainer}>
              <Text style={styles.limitLabel}>
                <Text style={styles.limitValue}>1</Text> mín
              </Text>
              <Text style={styles.limitDivider}>•</Text>
              <Text style={styles.limitLabel}>
                <Text style={styles.limitValue}>{MAX_PHOTOS}</Text> máx
              </Text>
            </View>
          </View>
        </View>

        {/* Horizontal List of Photos */}
        {photos.length > 0 && (
          <FlatList
            data={photos}
            horizontal
            keyExtractor={item => item.id}
            style={styles.photoList}
            contentContainerStyle={{ gap: 12 }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.photoThumbnail}>
                <Image source={{ uri: item.uri }} style={styles.thumbImage} />

                {/* Status Overlay - simplified for local */}
                <View style={styles.statusOverlay}>
                  <Ionicons
                    name="cloud-offline" // Symbolizing local storage
                    size={20}
                    color="#fff"
                  />
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveItem(item.id)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {/* Add Button */}
        <View style={styles.adderContainer}>
          <TouchableOpacity
            style={styles.addBtnContainer}
            onPress={() => openSelectionModal(section)}
            disabled={count >= MAX_PHOTOS}>
            <View
              style={[
                styles.addBtn,
                count >= MAX_PHOTOS && styles.disabledBtn,
              ]}>
              <Ionicons name="camera-outline" size={20} color="white" />
              <Text style={styles.addBtnText}>
                {count >= MAX_PHOTOS ? 'Máximo alcanzado' : 'Agregar Foto'}
              </Text>
            </View>
          </TouchableOpacity>
          {count < 1 && (
            <Text style={styles.requirementText}>Agregue al menos 1 foto</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader
        title="Mantenimiento preventivo"
        iconName="home-repair-service"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PhotoBoxSection
          title="Fotos de tablero (Antes)"
          photos={panelPhotos}
          section="panel"
        />

        {tipoTablero === 'autosoportado' && (
          <PhotoBoxSection
            title="Medición Termográfica"
            photos={thermoPhotos}
            section="thermo"
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !isFormValid && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!isFormValid}>
          <Text style={styles.continueBtnText}>Continuar</Text>
        </TouchableOpacity>
        {!isFormValid && (
          <Text style={styles.footerSubtext}>
            {isThermoRequired
              ? 'Agregue al menos 1 foto en cada sección.'
              : 'Agregue al menos 1 foto del tablero.'}
          </Text>
        )}
      </View>

      {/* Modal Selection */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar origen</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handleCamera}>
              <Ionicons name="camera" size={24} color="#06B6D4" />
              <Text style={styles.modalOptionText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleGallery}>
              <Ionicons name="images" size={24} color="#06B6D4" />
              <Text style={styles.modalOptionText}>Elegir de Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F7FA',
    padding: 16,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  countBadgePending: {
    backgroundColor: '#FEE2E2',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  countTextSuccess: {
    color: '#10B981',
  },
  countTextPending: {
    color: '#EF4444',
  },
  limitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  limitLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  limitValue: {
    fontWeight: '600',
    color: '#374151',
  },
  limitDivider: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  sectionCounter: {
    fontSize: 16,
  },
  counterPending: { color: '#EF4444' },
  counterSuccess: { color: '#10B981' },

  photoList: {
    marginBottom: 16,
    maxHeight: 110,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 2,
  },

  adderContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  addBtnContainer: {
    // Just a wrapper
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06B6D4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  requirementText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8,
  },
  continueBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 10,
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#D1D5DB',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  modalCancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
