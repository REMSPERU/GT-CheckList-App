import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TableroElectricoResponse } from '@/types/api';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { useUserRole } from '@/hooks/use-user-role';
import { useEffect, useState } from 'react';
import { DatabaseService } from '@/services/database';

export default function PanelDetailModal() {
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
          // Fallback for backward compatibility just in case
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

  if (isLoading) {
    return (
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={modalStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Detalle del Tablero</Text>
        </View>
        <View style={modalStyles.centerContent}>
          <ActivityIndicator size="large" color="#0891B2" />
          <Text style={{ marginTop: 16 }}>Cargando información...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const detail = panel?.equipment_detail || null;

  if (!panel || !detail) {
    return (
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={modalStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Detalle del Tablero</Text>
        </View>
        <View style={modalStyles.centerContent}>
          <Text>No se encontró información del detalle.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={modalStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={modalStyles.headerTitle}>Detalle del Tablero</Text>
        <View style={{ flex: 1 }} />
        {(isAdmin || isSupervisor) && (
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
            style={modalStyles.editButton}>
            <Ionicons name="pencil" size={20} color="#0891B2" />
            <Text style={modalStyles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={modalStyles.content}>
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
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
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
