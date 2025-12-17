import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useFormContext, Controller } from "react-hook-form";
import { BasicInfoStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';

export default function BasicInfoStep({
  panel,
}: BasicInfoStepProps) {
  const { control, formState: { errors } } = useFormContext<PanelConfigurationFormValues>();

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>

      {/* Tipo de tablero */}
      <Text style={styles.sectionTitle}>Seleccione el tipo de tablero</Text>
      <Controller
        control={control}
        name="panelType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segment, value === 'adosado' && styles.segmentActive]}
              onPress={() => onChange('adosado')}
            >
              <Text style={[styles.segmentText, value === 'adosado' && styles.segmentTextActive]}>
                Adosado
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, value === 'empotrado' && styles.segmentActive]}
              onPress={() => onChange('empotrado')}
            >
              <Text style={[styles.segmentText, value === 'empotrado' && styles.segmentTextActive]}>
                Empotrado
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Voltaje */}
      <Text style={styles.sectionTitle}>Voltaje:</Text>
      <Controller
        control={control}
        name="voltage"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, errors.voltage && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
                placeholder="220"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.unitWrapper}>
                <Text style={styles.unitText}>V</Text>
              </View>
            </View>
            {errors.voltage && (
              <Text style={styles.errorText}>{errors.voltage.message}</Text>
            )}
          </View>
        )}
      />

      {/* Fases */}
      <Text style={styles.sectionTitle}>Fases:</Text>
      <Controller
        control={control}
        name="phase"
        render={({ field: { onChange, value } }) => (
          <View style={styles.listButtons}>
            <TouchableOpacity
              style={[styles.listButton, value === 'mono_2w' && styles.listButtonActive]}
              onPress={() => onChange('mono_2w')}
            >
              <Text style={[styles.listButtonText, value === 'mono_2w' && styles.listButtonTextActive]}>
                Monofásico 2 hilos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.listButton, value === 'tri_3w' && styles.listButtonActive]}
              onPress={() => onChange('tri_3w')}
            >
              <Text style={[styles.listButtonText, value === 'tri_3w' && styles.listButtonTextActive]}>
                Trifásico 3 hilos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.listButton, value === 'tri_4w' && styles.listButtonActive]}
              onPress={() => onChange('tri_4w')}
            >
              <Text style={[styles.listButtonText, value === 'tri_4w' && styles.listButtonTextActive]}>
                Trifásico 4 hilos
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

// Styles for BasicInfoStep
const styles = StyleSheet.create({
  contentWrapper: {
    paddingHorizontal: 24,
    paddingTop: 16
  },
  equipmentLabel: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 12
  },
  sectionTitle: {
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 8,
    fontWeight: '600'
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16
  },
  segment: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  segmentActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0891B2'
  },
  segmentText: {
    color: '#11181C'
  },
  segmentTextActive: {
    color: '#0891B2',
    fontWeight: '600'
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16
  },
  input: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    color: '#11181C'
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4
  },
  unitWrapper: {
    position: 'absolute',
    right: 12,
    top: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  unitText: {
    color: '#6B7280'
  },
  listButtons: {
    gap: 12
  },
  listButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  listButtonActive: {
    borderColor: '#0891B2',
    backgroundColor: '#E0F2FE'
  },
  listButtonText: {
    color: '#11181C'
  },
  listButtonTextActive: {
    color: '#0891B2',
    fontWeight: '600'
  },
});
