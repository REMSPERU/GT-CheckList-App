import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';
import MaintenanceHeader from '@/components/maintenance-header';
import { useMaintenanceSession } from '@/hooks/use-maintenance-session';
import { PhotoItem } from '@/types/maintenance-session';

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panelId: string;
    maintenanceId: string;
  }>();
  const { panelId, maintenanceId } = params;

  const { session, clearSession } = useMaintenanceSession(
    panelId || '',
    maintenanceId,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  if (!session) return <ActivityIndicator />;

  const BUCKET_NAME = 'maintenance';

  const doUploadPhoto = async (photo: PhotoItem, folder: string) => {
    try {
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<string>((resolve, reject) => {
        reader.onload = async () => {
          if (reader.result) {
            try {
              const arrayBuffer = decode(
                (reader.result as string).split(',')[1],
              );
              const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
              const filePath = `execution/${folder}/${fileName}`;

              const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, arrayBuffer, {
                  contentType: 'image/jpeg',
                  upsert: false,
                });

              if (error) throw error;

              const {
                data: { publicUrl },
              } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
              resolve(publicUrl);
            } catch (e) {
              reject(e);
            }
          }
        };
        reader.onerror = e => reject(e);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      throw e;
    }
  };

  const handleFinalize = async () => {
    setIsUploading(true);
    setUploadProgress('Subiendo fotos...');

    try {
      // 1. Upload Pre-Photos
      const prePhotosUrls = [];
      for (const p of session.prePhotos) {
        setUploadProgress(`Subiendo foto ${p.id.slice(-4)}...`);
        const url = await doUploadPhoto(p, 'pre');
        prePhotosUrls.push({ ...p, url, status: 'done' });
      }

      // 2. Upload Post-Photos
      const postPhotosUrls = [];
      for (const p of session.postPhotos) {
        setUploadProgress(`Subiendo foto final ${p.id.slice(-4)}...`);
        const url = await doUploadPhoto(p, 'post');
        postPhotosUrls.push({ ...p, url, status: 'done' });
      }

      setUploadProgress('Guardando reporte...');

      // 3. Prepare final data
      const detailMaintenance = {
        prePhotos: prePhotosUrls,
        postPhotos: postPhotosUrls,
        checklist: session.checklist,
        itemObservations: session.itemObservations,
        observations: session.observations,
        completedAt: new Date().toISOString(),
      };

      console.log(
        'FINAL DATA FOR DB (detail_maintenance):',
        JSON.stringify(detailMaintenance, null, 2),
      );

      // 4. Clear Local Session
      await clearSession();

      Alert.alert('Éxito', 'Mantenimiento finalizado correctamente.', [
        {
          text: 'OK',
          onPress: () =>
            router.push(
              '/maintenance/scheduled_maintenance/scheduled-maintenance',
            ),
        },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Hubo un error al subir la información.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderPhotoGrid = (photos: PhotoItem[]) => {
    if (photos.length === 0)
      return <Text style={styles.emptyText}>No hay fotos</Text>;
    return (
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <Image
            key={photo.id || index}
            source={{ uri: photo.uri }}
            style={styles.photoThumbnail}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader title="Resumen" iconName="flag" />

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Fotos Previas ({session.prePhotos.length})
          </Text>
          {renderPhotoGrid(session.prePhotos)}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Checklist</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Object.keys(session.checklist).length}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {
                  Object.values(session.checklist).filter(v => v === true)
                    .length
                }
              </Text>
              <Text style={styles.statLabel}>OK</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {
                  Object.values(session.checklist).filter(v => v === false)
                    .length
                }
              </Text>
              <Text style={styles.statLabel}>Issues</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Fotos Finales ({session.postPhotos.length})
          </Text>
          {renderPhotoGrid(session.postPhotos)}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, isUploading && styles.disabledBtn]}
          onPress={handleFinalize}
          disabled={isUploading}>
          {isUploading ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.continueBtnText}>{uploadProgress}</Text>
            </View>
          ) : (
            <Text style={styles.continueBtnText}>Finalizar Mantenimiento</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, backgroundColor: '#F3F7FA', padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    // Shadow
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#11181C',
  },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11181C',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueBtn: {
    backgroundColor: '#06B6D4', // Changed to Brand Color
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#67E8F9' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
