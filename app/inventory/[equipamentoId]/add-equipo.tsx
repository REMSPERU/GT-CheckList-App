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
import { useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { DynamicFieldRenderer } from '@/components/inventory/dynamic-field-renderer';
import { getTechnicalFields } from '@/types/inventory';
import {
  equipoCreateBaseSchema,
  UBICACION_OPTIONS,
  ESTATUS_OPTIONS,
  type EquipoCreateFormValues,
} from '@/schemas/equipment-create';
import { useCreateEquipo } from '@/hooks/use-inventory-query';
import { generateEquipmentCode } from '@/services/db/equipment';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

export default function AddEquipoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const equipamentoId = getSingleParam(params.equipamentoId);
  const equipamentoNombre = getSingleParam(params.equipamentoNombre);
  const equipamentoAbreviatura = getSingleParam(params.equipamentoAbreviatura);
  const propertyId = getSingleParam(params.propertyId);
  const propertyName = getSingleParam(params.propertyName);

  const techFields = getTechnicalFields(equipamentoAbreviatura);
  const createEquipo = useCreateEquipo();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EquipoCreateFormValues>({
    resolver: zodResolver(equipoCreateBaseSchema),
    defaultValues: {
      codigo: '',
      ubicacion: '',
      detalle_ubicacion: null,
      estatus: 'ACTIVO',
      equipment_detail: {},
    },
  });

  const handleAutoCode = useCallback(async () => {
    try {
      const prefix = equipamentoAbreviatura || 'EQ';
      const code = await generateEquipmentCode(propertyId, prefix);
      setValue('codigo', code, { shouldValidate: true });
    } catch {
      Alert.alert('Error', 'No se pudo generar el código automático.');
    }
  }, [propertyId, equipamentoAbreviatura, setValue]);

  const onSubmit = useCallback(
    async (values: EquipoCreateFormValues) => {
      try {
        await createEquipo.mutateAsync({
          id_property: propertyId,
          id_equipamento: equipamentoId,
          codigo: values.codigo.trim().toUpperCase(),
          ubicacion: values.ubicacion,
          detalle_ubicacion: values.detalle_ubicacion ?? undefined,
          estatus: values.estatus,
          equipment_detail: values.equipment_detail as Record<string, unknown>,
        });
        Alert.alert(
          'Equipo agregado',
          `${values.codigo} creado correctamente.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al guardar el equipo.';
        Alert.alert('Error', message);
      }
    },
    [createEquipo, equipamentoId, propertyId, router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancelar">
          <Ionicons name="close" size={22} color="#0F172A" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.breadcrumb} numberOfLines={1}>
            {propertyName}
          </Text>
          <Text style={styles.headerTitle}>Agregar Equipo</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            (isSubmitting || createEquipo.isPending) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || createEquipo.isPending}
          accessibilityRole="button"
          accessibilityLabel="Guardar equipo">
          {createEquipo.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </Pressable>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Tipo de equipo */}
          <View style={styles.typeTag}>
            <Ionicons name="cube-outline" size={14} color="#0891B2" />
            <Text style={styles.typeTagText}>
              {equipamentoNombre || 'Equipo'}
            </Text>
            {equipamentoAbreviatura ? (
              <Text style={styles.typeTagAbbr}>[{equipamentoAbreviatura}]</Text>
            ) : null}
          </View>

          {/* Sección: Datos base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos Generales</Text>

            {/* Código */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>
                Código de Inventario <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.codeRow}>
                <Controller
                  control={control}
                  name="codigo"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        styles.codeInput,
                        errors.codigo && styles.inputError,
                      ]}
                      value={value}
                      onChangeText={text => onChange(text.toUpperCase())}
                      onBlur={onBlur}
                      placeholder="ej. AZC-CHILLA-001"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />
                  )}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.autoCodeBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleAutoCode}
                  accessibilityLabel="Generar código automático">
                  <Ionicons name="flash-outline" size={16} color="#0891B2" />
                  <Text style={styles.autoCodeBtnText}>Auto</Text>
                </Pressable>
              </View>
              {errors.codigo && (
                <Text style={styles.error}>{errors.codigo.message}</Text>
              )}
            </View>

            {/* Ubicación */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>
                Ubicación <Text style={styles.required}>*</Text>
              </Text>
              <Controller
                control={control}
                name="ubicacion"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.optionsWrap}>
                    {UBICACION_OPTIONS.map(opt => (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.optionChip,
                          value === opt.value && styles.optionChipSelected,
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
              {errors.ubicacion && (
                <Text style={styles.error}>{errors.ubicacion.message}</Text>
              )}
            </View>

            {/* Detalle de ubicación */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Detalle de Ubicación (opcional)</Text>
              <Controller
                control={control}
                name="detalle_ubicacion"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={styles.input}
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="ej. Sala de máquinas, Nivel -1"
                    placeholderTextColor="#94A3B8"
                  />
                )}
              />
            </View>

            {/* Estatus */}
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
                          value === opt.value && styles.optionChipSelected,
                          opt.value === 'ACTIVO' &&
                            value === opt.value &&
                            styles.optionChipActivo,
                          opt.value === 'INACTIVO' &&
                            value === opt.value &&
                            styles.optionChipInactivo,
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
          </View>

          {/* Sección: Especificaciones Técnicas */}
          {techFields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Especificaciones Técnicas</Text>
              <DynamicFieldRenderer
                fields={techFields}
                fieldPrefix="equipment_detail"
                control={control as Control<EquipoCreateFormValues>}
              />
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 72,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14 },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFEFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFFAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  typeTagText: { fontSize: 13, fontWeight: '700', color: '#0891B2' },
  typeTagAbbr: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#EF4444' },
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
  inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: { flex: 1 },
  autoCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  autoCodeBtnText: { fontSize: 13, fontWeight: '700', color: '#0891B2' },
  error: { fontSize: 12, color: '#EF4444' },
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
  optionChipActivo: { borderColor: '#16A34A', backgroundColor: '#DCFCE7' },
  optionChipInactivo: { borderColor: '#DC2626', backgroundColor: '#FEE2E2' },
  optionChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  optionChipTextSelected: { color: '#0891B2', fontWeight: '700' },
  bottomPad: { height: 40 },
});
