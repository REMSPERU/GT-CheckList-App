import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function PreMaintenancePhotosScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Correct mock counts for the UI logic
  const beforePhotosCount = 0;
  const thermoPhotosCount = 0;

  const handleContinue = () => {
    setIsLoading(true);
    // TODO: Implement navigation to the next step
    setTimeout(() => {
      setIsLoading(false);
      // router.push("/maintenance/next-step");
    }, 1000);
  };

  const PhotoBoxSection = ({ title, count, maxCount, onAdd }: {
    title: string;
    count: number;
    maxCount: number;
    onAdd: () => void;
  }) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCounter}>({count}/{maxCount})</Text>
      </View>

      <View style={styles.boxContainer}>
        <TouchableOpacity style={styles.addBtnContainer} onPress={onAdd}>
          <View style={styles.addBtn}>
            <Ionicons name="camera-outline" size={20} color="white" />
            <Text style={styles.addBtnText}>Añadir Foto</Text>
          </View>
          <Text style={styles.requirementText}>Mínimo {maxCount} fotos requeridas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Refined Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerIconContainer}>
          <MaterialIcons name="home-repair-service" size={20} color="white" />
        </View>
        <Text style={styles.headerTitle}>Mantenimiento preventivo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PhotoBoxSection
          title="Fotos de tablero (Antes)"
          count={beforePhotosCount}
          maxCount={2}
          onAdd={() => console.log('Add before photo')}
        />

        <PhotoBoxSection
          title="Medición Termográfica"
          count={thermoPhotosCount}
          maxCount={2}
          onAdd={() => console.log('Add thermo photo')}
        />
      </ScrollView>

      {/* Refined Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, styles.disabledBtn]}
          onPress={handleContinue}
          disabled={true} // Disabled until requirements are met
        >
          <Text style={styles.continueBtnText}>Continuar</Text>
        </TouchableOpacity>
        <Text style={styles.footerSubtext}>Complete los requisitos para continuar.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 10,
  },
  headerIconContainer: {
    backgroundColor: '#06B6D4',
    padding: 6,
    borderRadius: 8,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F7FA', // Subtle bluish background as in mockup
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  sectionCounter: {
    fontSize: 18,
    color: '#6B7280',
  },
  boxContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnContainer: {
    alignItems: 'center',
    gap: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requirementText: {
    fontSize: 14,
    color: '#4B5563',
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
    backgroundColor: '#D1D5DB', // Grayed out as in mockup
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
