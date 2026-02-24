import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TableroElectricoResponse } from '@/types/api';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { useUserRole } from '@/hooks/use-user-role';
import { useEffect, useState } from 'react';
import { DatabaseService } from '@/services/database';

export default function PanelDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAdmin, isSupervisor } = useUserRole();

  const [panel, setPanel] = useState<TableroElectricoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPanel() {
      try {
        if (params.panelId) {
          const data = await DatabaseService.getEquipmentById(
            params.panelId as string,
          );
          setPanel(data as TableroElectricoResponse);
        } else if (params.panel) {
          setPanel(JSON.parse(params.panel as string));
        }
      } catch (e) {
        console.error('Error fetching panel data', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPanel();
  }, [params.panelId, params.panel]);

  const detail = panel?.equipment_detail || null;

  // Single stable wrapper so SafeAreaView and header never remount,
  // which prevents the layout jump between loading and loaded states.
  return (
    <SafeAreaView style={styles.container}>
      {/* Header – always visible */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Tablero</Text>
        <View style={{ flex: 1 }} />
        {!isLoading && panel && (isAdmin || isSupervisor) && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: '/maintenance/electrical-panels/configuration',
                params: {
                  panelId: panel.id,
                  isEditMode: 'true',
                },
              });
            }}
            style={styles.editButton}>
            <Ionicons name="pencil" size={20} color="#0891B2" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body – changes based on state */}
      {isLoading ? (
        // No spinner — SQLite is instant (<10ms) so showing a spinner
        // would only produce a layout jump when content replaces it.
        // The body just stays empty for that brief moment.
        <View style={{ flex: 1 }} />
      ) : !panel || !detail ? (
        <View style={styles.centerContent}>
          <Text>No se encontró información del detalle.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <PanelDetailContent
            data={{
              rotulo: detail.rotulo || '',
              tipo_tablero: detail.tipo_tablero || '',
              detalle_tecnico: detail.detalle_tecnico,
              itgs: detail.itgs || [],
              componentes: detail.componentes || [],
              condiciones_especiales: detail.condiciones_especiales,
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    gap: 4,
  },
  editButtonText: {
    color: '#0891B2',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
});
