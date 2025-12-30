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
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';

import MaintenanceHeader from '@/components/maintenance-header';
import { supabase } from '@/lib/supabase';

interface PhotoItem {
  id: string; // local URI or UUID
  uri: string;
  status: 'pending' | 'uploading' | 'error' | 'done';
  remotePath?: string;
  url?: string;
}

export default function PreMaintenancePhotosScreen() {
  const router = useRouter();
  const [panelPhotos, setPanelPhotos] = useState<PhotoItem[]>([]);
  const [thermoPhotos, setThermoPhotos] = useState<PhotoItem[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSection, setCurrentSection] = useState<
    'panel' | 'thermo' | null
  >(null);

  // Request permissions on mount (optional, expo-image-picker handles this automatically mostly)
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const libraryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted' || libraryStatus.status !== 'granted') {
        // Alert.alert('Permiso requerido', 'Se requiere acceso a la cámara y galería.');
      }
    })();
  }, []);

  // CONFIG: Bucket Name in Supabase Storage
  const BUCKET_NAME = 'maintenance';

  const uploadImageToSupabase = async (
    uri: string,
    folder: string,
  ): Promise<{ path: string; publicUrl: string } | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          if (reader.result) {
            try {
              const arrayBuffer = decode(
                (reader.result as string).split(',')[1],
              );
              const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
              const filePath = `pre-maintenance/${folder}/${fileName}`;

              console.log(
                `Uploading to bucket: ${BUCKET_NAME}, path: ${filePath}`,
              );

              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, arrayBuffer, {
                  contentType: 'image/jpeg',
                  upsert: false,
                });

              if (error) {
                console.error('Supabase Upload error:', error);
                Alert.alert(
                  'Upload Error',
                  `Error uploading to ${BUCKET_NAME}: ${error.message}`,
                );
                reject(error);
                return;
              }

              const {
                data: { publicUrl },
              } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

              console.log('Upload successful:', publicUrl);
              resolve({ path: filePath, publicUrl });
            } catch (innerError) {
              console.error('Error during upload preparation:', innerError);
              reject(innerError);
            }
          }
        };
        reader.onerror = err => {
          console.error('FileReader error:', err);
          reject(err);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Processing Error', 'Error preparing image for upload.');
      return null;
    }
  };

  const openSelectionModal = (section: 'panel' | 'thermo') => {
    setCurrentSection(section);
    setModalVisible(true);
  };

  const handleCamera = async () => {
    setModalVisible(false);
    if (!currentSection) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Fixed: MediaType -> MediaTypeOptions
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      const asset = result.assets[0];
      const newPhoto: PhotoItem = {
        id: asset.uri,
        uri: asset.uri,
        status: 'pending',
      };

      if (section === 'panel') {
        setPanelPhotos(prev => [...prev, newPhoto]);
      } else {
        setThermoPhotos(prev => [...prev, newPhoto]);
      }

      await processUpload(newPhoto, section);
    }
  };

  const processUpload = async (
    photo: PhotoItem,
    section: 'panel' | 'thermo',
  ) => {
    updatePhotoStatus(photo.id, 'uploading', section);

    try {
      const result = await uploadImageToSupabase(photo.uri, section);
      if (result) {
        updatePhotoStatus(
          photo.id,
          'done',
          section,
          result.path,
          result.publicUrl,
        );
      } else {
        updatePhotoStatus(photo.id, 'error', section);
      }
    } catch (e) {
      updatePhotoStatus(photo.id, 'error', section);
    }
  };

  const updatePhotoStatus = (
    id: string,
    status: PhotoItem['status'],
    section: 'panel' | 'thermo',
    remotePath?: string,
    url?: string,
  ) => {
    const updater = (prev: PhotoItem[]) =>
      prev.map(p => (p.id === id ? { ...p, status, remotePath, url } : p));

    if (section === 'panel') setPanelPhotos(updater);
    else setThermoPhotos(updater);
  };

  const removeItem = (id: string, section: 'panel' | 'thermo') => {
    if (section === 'panel') {
      setPanelPhotos(prev => prev.filter(p => p.id !== id));
    } else {
      setThermoPhotos(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleContinue = () => {
    setIsGlobalLoading(true);
    // Here you would save the photo URLs to your main inspection record or pass them forward
    console.log(
      'Panel Photos:',
      panelPhotos.map(p => p.url),
    );
    console.log(
      'Thermo Photos:',
      thermoPhotos.map(p => p.url),
    );

    setTimeout(() => {
      setIsGlobalLoading(false);
      // Navigate to next step
      // router.push("/maintenance/panel-selection");
    }, 1000);
  };

  // Validation: Min 2 photos each, and all must be uploaded (status 'done')
  const MIN_PHOTOS = 2;
  const panelValid =
    panelPhotos.filter(p => p.status === 'done').length >= MIN_PHOTOS;
  const thermoValid =
    thermoPhotos.filter(p => p.status === 'done').length >= MIN_PHOTOS;
  const isFormValid = panelValid && thermoValid;

  const PhotoBoxSection = ({
    title,
    photos,
    section,
  }: {
    title: string;
    photos: PhotoItem[];
    section: 'panel' | 'thermo';
  }) => {
    const count = photos.filter(p => p.status === 'done').length;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text
            style={[
              styles.sectionCounter,
              count >= MIN_PHOTOS
                ? styles.counterSuccess
                : styles.counterPending,
            ]}>
            ({count}/{MIN_PHOTOS} min)
          </Text>
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

                {/* Status Overlay */}
                <View style={styles.statusOverlay}>
                  {item.status === 'uploading' && (
                    <ActivityIndicator size="small" color="#FFF" />
                  )}
                  {item.status === 'done' && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                    />
                  )}
                  {item.status === 'error' && (
                    <TouchableOpacity
                      onPress={() => processUpload(item, section)}>
                      <Ionicons
                        name="reload-circle"
                        size={24}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeItem(item.id, section)}>
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
            onPress={() => openSelectionModal(section)}>
            <View style={styles.addBtn}>
              <Ionicons name="camera-outline" size={20} color="white" />
              <Text style={styles.addBtnText}>Agregar Foto</Text>
            </View>
          </TouchableOpacity>
          {count < MIN_PHOTOS && (
            <Text style={styles.requirementText}>
              Faltan {MIN_PHOTOS - count} foto(s)
            </Text>
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

        <PhotoBoxSection
          title="Medición Termográfica"
          photos={thermoPhotos}
          section="thermo"
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !isFormValid && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!isFormValid || isGlobalLoading}>
          {isGlobalLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.continueBtnText}>Continuar</Text>
          )}
        </TouchableOpacity>
        {!isFormValid && (
          <Text style={styles.footerSubtext}>
            Complete el mínimo de fotos requeridas.
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
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
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
