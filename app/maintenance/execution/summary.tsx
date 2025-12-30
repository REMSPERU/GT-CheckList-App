import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

      // 3. Save Maintenance Record to DB (mocked for now, or use Supabase insert)
      // Here you would call your API to save `session.checklist` and the photo URLs.
      // await maintenanceApi.complete(...)

      console.log('FINAL DATA:', {
        pre: prePhotosUrls,
        checklist: session.checklist,
        post: postPhotosUrls,
      });

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
        // Or go back to home
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Hubo un error al subir la información.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MaintenanceHeader title="Resumen" iconName="flag" />

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos Previas</Text>
          <Text>{session.prePhotos.length} fotos listas para subir</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Checklist</Text>
          <Text>{Object.keys(session.checklist).length} items verificados</Text>
          <Text style={{ color: '#10B981' }}>
            {Object.values(session.checklist).filter(v => v === true).length} OK
          </Text>
          <Text style={{ color: '#EF4444' }}>
            {Object.values(session.checklist).filter(v => v === false).length}{' '}
            Fallos
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotos Finales</Text>
          <Text>{session.postPhotos.length} fotos listas para subir</Text>
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
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  continueBtn: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#6EE7B7' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
