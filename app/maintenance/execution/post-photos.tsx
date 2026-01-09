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
import { PhotoItem } from '@/types/maintenance-session';

export default function PostMaintenancePhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  const { session, loading, addPhoto, removePhoto } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
  );

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
    })();
  }, []);

  const handleCamera = async () => {
    setModalVisible(false);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      handleImageResult(result);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const handleGallery = async () => {
    setModalVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
      });

      handleImageResult(result);
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newPhoto: PhotoItem = {
        id: asset.uri,
        uri: asset.uri,
        status: 'pending',
        category: 'visual', // Default for post photos
      };

      // Add to POST photos
      addPhoto('post', newPhoto);
    }
  };

  const handleRemoveItem = (id: string) => {
    removePhoto('post', id);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/maintenance/execution/summary',
      params: { panelId, maintenanceId },
    });
  };

  if (loading || !session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  const photos = session.postPhotos;

  const MIN_PHOTOS = 1; // Maybe optional? or min 1?
  const isFormValid = photos.length >= MIN_PHOTOS;

  const PhotoBoxSection = ({
    title,
    photos,
  }: {
    title: string;
    photos: PhotoItem[];
  }) => {
    const count = photos.length;

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
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveItem(item.id)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        <View style={styles.adderContainer}>
          <TouchableOpacity
            style={styles.addBtnContainer}
            onPress={() => setModalVisible(true)}>
            <View style={styles.addBtn}>
              <Ionicons name="camera-outline" size={20} color="white" />
              <Text style={styles.addBtnText}>Agregar Foto</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader title="Mantenimiento Finalizado" iconName="camera" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PhotoBoxSection title="Fotos Finales (Después)" photos={photos} />
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !isFormValid && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!isFormValid}>
          <Text style={styles.continueBtnText}>Ver Resumen y Finalizar</Text>
        </TouchableOpacity>
      </View>

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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, backgroundColor: '#F3F7FA', padding: 16 },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  sectionCounter: { fontSize: 16 },
  counterPending: { color: '#EF4444' },
  counterSuccess: { color: '#10B981' },
  photoList: { marginBottom: 16, maxHeight: 110 },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    position: 'relative',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: { width: '100%', height: '100%', borderRadius: 8 },
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
  addBtnContainer: {},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06B6D4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
  disabledBtn: { backgroundColor: '#D1D5DB' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  modalOptionText: { fontSize: 16, fontWeight: '500', color: '#374151' },
  modalCancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});
