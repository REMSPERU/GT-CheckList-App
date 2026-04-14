import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';

import DefaultHeader from '@/components/default-header';
import { supabasePropertyService } from '@/services/supabase-property.service';
import {
  supabaseUserPropertyService,
  type AuditorUser,
  type UserPropertyAssignment,
} from '@/services/supabase-user-property.service';

function getUserDisplayName(user: AuditorUser) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName.length > 0) return fullName;
  if (user.username) return user.username;
  return user.email;
}

export default function AssignAuditorPropertiesScreen() {
  const [auditors, setAuditors] = useState<AuditorUser[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [assignments, setAssignments] = useState<UserPropertyAssignment[]>([]);

  const [selectedAuditor, setSelectedAuditor] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [assignmentReason, setAssignmentReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);

  const propertyNameMap = useMemo(() => {
    return new Map(properties.map(item => [item.id, item.name]));
  }, [properties]);

  const selectedAuditorName = useMemo(() => {
    if (!selectedAuditor) return null;
    const auditor = auditors.find(item => item.id === selectedAuditor);
    return auditor ? getUserDisplayName(auditor) : null;
  }, [auditors, selectedAuditor]);

  const loadCatalogData = useCallback(async () => {
    try {
      setLoading(true);
      const [auditorList, propertyListResponse] = await Promise.all([
        supabaseUserPropertyService.listAuditors(),
        supabasePropertyService.list({ is_active: true, limit: 200 }),
      ]);

      setAuditors(auditorList);
      setProperties(
        propertyListResponse.items.map(item => ({
          id: item.id,
          name: item.name,
        })),
      );
    } catch {
      Alert.alert('Error', 'No se pudieron cargar auditores e inmuebles.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (auditorId: string | null) => {
    if (!auditorId) {
      setAssignments([]);
      return;
    }

    try {
      setLoadingAssignments(true);
      const data =
        await supabaseUserPropertyService.getAssignmentsForUser(auditorId);
      setAssignments(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las asignaciones actuales.');
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  useEffect(() => {
    loadAssignments(selectedAuditor);
  }, [loadAssignments, selectedAuditor]);

  const handleAssign = async () => {
    if (!selectedAuditor || !selectedProperty) {
      Alert.alert('Faltan datos', 'Seleccione auditor e inmueble.');
      return;
    }

    try {
      setSaving(true);
      await supabaseUserPropertyService.assignAuditorToProperty({
        auditorId: selectedAuditor,
        propertyId: selectedProperty,
        assignmentReason: assignmentReason.trim() || null,
      });

      await loadAssignments(selectedAuditor);
      setSelectedProperty(null);
      setAssignmentReason('');

      Alert.alert('Listo', 'Asignacion registrada en user_properties.');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la asignacion';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const auditorItems = auditors.map(user => ({
    label: `${getUserDisplayName(user)} (${user.email})`,
    value: user.id,
  }));

  const propertyItems = properties.map(property => ({
    label: property.name,
    value: property.id,
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DefaultHeader title="Asignar Auditor a Inmueble" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0891B2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DefaultHeader title="Asignar Auditor a Inmueble" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nueva asignacion</Text>

          <Text style={styles.label}>Auditor</Text>
          <RNPickerSelect
            onValueChange={value => setSelectedAuditor(value)}
            value={selectedAuditor}
            items={auditorItems}
            placeholder={{ label: 'Seleccione un auditor...', value: null }}
            style={pickerSelectStyles}
          />

          <Text style={styles.label}>Inmueble</Text>
          <RNPickerSelect
            onValueChange={value => setSelectedProperty(value)}
            value={selectedProperty}
            items={propertyItems}
            placeholder={{ label: 'Seleccione un inmueble...', value: null }}
            style={pickerSelectStyles}
          />

          <Text style={styles.label}>Motivo (opcional)</Text>
          <TextInput
            style={styles.input}
            value={assignmentReason}
            onChangeText={setAssignmentReason}
            placeholder="Ej: Auditoria mensual edificio A"
            placeholderTextColor="#9CA3AF"
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (saving || !selectedAuditor || !selectedProperty) &&
                styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={handleAssign}
            disabled={saving || !selectedAuditor || !selectedProperty}
            accessibilityRole="button">
            <Text style={styles.buttonText}>
              {saving ? 'Guardando...' : 'Guardar asignacion'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asignaciones actuales</Text>

          {selectedAuditorName && (
            <View style={styles.auditorBadge}>
              <Text style={styles.auditorBadgeText}>{selectedAuditorName}</Text>
            </View>
          )}

          {!selectedAuditor && (
            <Text style={styles.helperText}>
              Seleccione un auditor para ver sus inmuebles asignados.
            </Text>
          )}

          {selectedAuditor && loadingAssignments && (
            <ActivityIndicator size="small" color="#0891B2" />
          )}

          {selectedAuditor &&
            !loadingAssignments &&
            assignments.length === 0 && (
              <Text style={styles.helperText}>
                Este auditor aun no tiene asignaciones.
              </Text>
            )}

          {selectedAuditor &&
            !loadingAssignments &&
            assignments.map(item => (
              <View key={item.property_id} style={styles.assignmentCard}>
                <Text style={styles.assignmentTitle}>
                  {propertyNameMap.get(item.property_id) || item.property_id}
                </Text>
                <Text style={styles.assignmentMeta}>
                  Rol: {item.property_role || 'AUDITOR'}
                </Text>
                {!!item.assignment_reason && (
                  <Text style={styles.assignmentMeta}>
                    Motivo: {item.assignment_reason}
                  </Text>
                )}
                <Text style={styles.assignmentMeta}>
                  Asignado:{' '}
                  {item.assigned_at
                    ? new Date(item.assigned_at).toLocaleString()
                    : 'N/A'}
                </Text>
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0891B2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
  },
  auditorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  auditorBadgeText: {
    color: '#0E7490',
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  assignmentMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  pressed: {
    opacity: 0.85,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputAndroid: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});
