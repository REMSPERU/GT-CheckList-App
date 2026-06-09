import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { TechnicalDetailView } from '@/components/inventory/technical-detail-view';
import { DynamicFieldRenderer } from '@/components/inventory/dynamic-field-renderer';
import { EquipmentStatusBadge } from '@/components/inventory/equipment-status-badge';
import { UbicacionLabel } from '@/components/inventory/ubicacion-label';
import { getTechnicalFields } from '@/types/inventory';
import {
  equipoDetailEditSchema,
  ESTATUS_OPTIONS,
  type EquipoDetailEditFormValues,
} from '@/schemas/equipment-create';
import {
  useInventoryEquipoDetail,
  useUpdateEquipo,
} from '@/hooks/use-inventory-query';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

export default function EquipoDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const equipoId = getSingleParam(params.equipoId);
  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);
  const equipamentoId = getSingleParam(params.equipamentoId);
  const equipamentoNombre = getSingleParam(params.equipamentoNombre);
  const equipamentoAbreviatura = getSingleParam(params.equipamentoAbreviatura);

  const { data: equipo, isLoading } = useInventoryEquipoDetail(equipoId);
  const updateEquipo = useUpdateEquipo(equipoId, propertyId, equipamentoId);

  const [isEditing, setIsEditing] = useState(false);

  const abreviatura = equipo?.equipamento_abreviatura ?? equipamentoAbreviatura;
  const techFields = getTechnicalFields(abreviatura);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<EquipoDetailEditFormValues>({
    resolver: zodResolver(equipoDetailEditSchema),
    defaultValues: {
      detalle_ubicacion: equipo?.detalle_ubicacion ?? null,
      estatus: (equipo?.estatus as 'ACTIVO' | 'INACTIVO') ?? 'ACTIVO',
      equipment_detail:
        (equipo?.equipment_detail as Record<string, unknown>) ?? {},
    },
  });

  const handleStartEdit = useCallback(() => {
    if (!equipo) return;
    reset({
      detalle_ubicacion: equipo.detalle_ubicacion ?? null,
      estatus: (equipo.estatus as 'ACTIVO' | 'INACTIVO') ?? 'ACTIVO',
      equipment_detail:
        (equipo.equipment_detail as Record<string, unknown>) ?? {},
    });
    setIsEditing(true);
  }, [equipo, reset]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const onSubmit = useCallback(
    async (values: EquipoDetailEditFormValues) => {
      try {
        await updateEquipo.mutateAsync({
          detalle_ubicacion: values.detalle_ubicacion ?? null,
          estatus: values.estatus,
          equipment_detail: values.equipment_detail as Record<string, unknown>,
        });
        setIsEditing(false);
        Alert.alert('Guardado', 'Los cambios se guardaron correctamente.');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al guardar los cambios.';
        Alert.alert('Error', message);
      }
    },
    [updateEquipo],
  );

  const displayNombre = equipo?.equipamento_nombre ?? equipamentoNombre;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            if (isEditing) {
              Alert.alert(
                'Descartar cambios',
                '¿Seguro que quieres salir sin guardar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: () => {
                      handleCancelEdit();
                      router.back();
                    },
                  },
                ],
              );
            } else {
              router.back();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {propertyName} · {displayNombre}
          </Text>
          <Text style={styles.headerTitle}>Detalle Técnico</Text>
        </View>
        {!isEditing ? (
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}
            onPress={handleStartEdit}
            accessibilityLabel="Editar especificaciones">
            <Ionicons name="create-outline" size={16} color="#0891B2" />
            <Text style={styles.editButtonText}>Editar</Text>
          </Pressable>
        ) : (
          <View style={styles.editActions}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
              onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
                (isSubmitting || updateEquipo.isPending) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || updateEquipo.isPending}>
              {updateEquipo.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Cargando detalle...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Identity card */}
            <View style={styles.identityCard}>
              <View style={styles.identityTopRow}>
                <Text style={styles.codigo}>{equipo?.codigo ?? '—'}</Text>
                <EquipmentStatusBadge estatus={equipo?.estatus} />
              </View>
              <UbicacionLabel
                ubicacion={equipo?.ubicacion}
                detalleUbicacion={equipo?.detalle_ubicacion}
              />
              {equipo?.sistema_nombre ? (
                <Text style={styles.sistemaNombre}>
                  {equipo.sistema_nombre}
                </Text>
              ) : null}
            </View>

            {/* Technical specs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Especificaciones Técnicas</Text>

              {!isEditing ? (
                <TechnicalDetailView
                  fields={techFields}
                  data={
                    equipo?.equipment_detail as Record<string, unknown> | null
                  }
                />
              ) : (
                <View style={styles.editSection}>
                  {/* Edit status */}
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Estado</Text>
                    <Controller
                      control={control}
                      name="estatus"
                      render={({ field: { value, onChange } }) => (
                        <View style={styles.optionsWrap}>
                          {ESTATUS_OPTIONS.map(opt => (
                            <Pressable
                              key={opt.value}
                              style={[
                                styles.optionChip,
                                value === opt.value &&
                                  styles.optionChipSelected,
                              ]}
                              onPress={() => onChange(opt.value)}>
                              <Text
                                style={[
                                  styles.optionChipText,
                                  value === opt.value &&
                                    styles.optionChipTextSelected,
                                ]}>
                                {opt.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    />
                  </View>

                  {/* Edit detalle ubicacion */}
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Detalle de Ubicación</Text>
                    <Controller
                      control={control}
                      name="detalle_ubicacion"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <TextInput
                          style={styles.input}
                          value={value ?? ''}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="ej. Sala de máquinas"
                          placeholderTextColor="#94A3B8"
                        />
                      )}
                    />
                  </View>

                  {/* Dynamic technical fields */}
                  <DynamicFieldRenderer
                    fields={techFields}
                    fieldPrefix="equipment_detail"
                    control={control as Control<EquipoDetailEditFormValues>}
                  />
                </View>
              )}
            </View>

            <View style={styles.bottomPad} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
  headerTextWrap: { flex: 1 },
  breadcrumb: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: { fontSize: 13, fontWeight: '700', color: '#0891B2' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  saveButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#06B6D4',
    minWidth: 72,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 15, color: '#64748B' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 8,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codigo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  sistemaNombre: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  editSection: { gap: 16 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  optionChipSelected: { borderColor: '#06B6D4', backgroundColor: '#ECFEFF' },
  optionChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  optionChipTextSelected: { color: '#0891B2', fontWeight: '700' },
  bottomPad: { height: 40 },
});
