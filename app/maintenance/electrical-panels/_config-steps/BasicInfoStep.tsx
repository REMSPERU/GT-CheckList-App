import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFormContext, Controller } from 'react-hook-form';
import { BasicInfoStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';

export default function BasicInfoStep({ panel }: BasicInfoStepProps) {
  const { control } = useFormContext<PanelConfigurationFormValues>();

  // Debug: ver el contenido del panel
  console.log(
    '🔍 [BasicInfoStep] Panel recibido:',
    JSON.stringify(panel, null, 2),
  );

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
      </Text>

      {/* Tipo de tablero */}
      <Text style={styles.sectionTitle}>Seleccione el tipo de tablero</Text>
      <Controller
        control={control}
        name="panelType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.listButtons}>
            <TouchableOpacity
              style={[
                styles.listButton,
                value === 'adosado' && styles.listButtonActive,
              ]}
              onPress={() => onChange('adosado')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'adosado' && styles.listButtonTextActive,
                ]}>
                Adosado
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listButton,
                value === 'empotrado' && styles.listButtonActive,
              ]}
              onPress={() => onChange('empotrado')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'empotrado' && styles.listButtonTextActive,
                ]}>
                Empotrado
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listButton,
                value === 'autosoportado' && styles.listButtonActive,
              ]}
              onPress={() => onChange('autosoportado')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'autosoportado' && styles.listButtonTextActive,
                ]}>
                Autosoportado
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
        render={({ field: { onChange, value } }) => (
          <View style={styles.voltageButtons}>
            <TouchableOpacity
              style={[
                styles.voltageButton,
                value === '220' && styles.voltageButtonActive,
              ]}
              onPress={() => onChange('220')}>
              <Text
                style={[
                  styles.voltageButtonText,
                  value === '220' && styles.voltageButtonTextActive,
                ]}>
                220V
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.voltageButton,
                value === '380' && styles.voltageButtonActive,
              ]}
              onPress={() => onChange('380')}>
              <Text
                style={[
                  styles.voltageButtonText,
                  value === '380' && styles.voltageButtonTextActive,
                ]}>
                380V
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.voltageButton,
                value === '440' && styles.voltageButtonActive,
              ]}
              onPress={() => onChange('440')}>
              <Text
                style={[
                  styles.voltageButtonText,
                  value === '440' && styles.voltageButtonTextActive,
                ]}>
                440V
              </Text>
            </TouchableOpacity>
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
              style={[
                styles.listButton,
                value === 'unipolar' && styles.listButtonActive,
              ]}
              onPress={() => onChange('unipolar')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'unipolar' && styles.listButtonTextActive,
                ]}>
                Unipolar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listButton,
                value === 'mono_2w' && styles.listButtonActive,
              ]}
              onPress={() => onChange('mono_2w')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'mono_2w' && styles.listButtonTextActive,
                ]}>
                Monofásico 2 hilos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listButton,
                value === 'tri_3w' && styles.listButtonActive,
              ]}
              onPress={() => onChange('tri_3w')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'tri_3w' && styles.listButtonTextActive,
                ]}>
                Trifásico 3 hilos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listButton,
                value === 'tri_4w' && styles.listButtonActive,
              ]}
              onPress={() => onChange('tri_4w')}>
              <Text
                style={[
                  styles.listButtonText,
                  value === 'tri_4w' && styles.listButtonTextActive,
                ]}>
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
    paddingTop: 16,
  },
  equipmentLabel: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 8,
    fontWeight: '600',
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 0, // Allows flex items to shrink below content size
  },
  segmentActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0891B2',
  },
  segmentText: {
    color: '#11181C',
    fontSize: 13,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#0891B2',
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    color: '#11181C',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  unitWrapper: {
    position: 'absolute',
    right: 12,
    top: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitText: {
    color: '#6B7280',
  },
  listButtons: {
    gap: 12,
  },
  listButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  listButtonActive: {
    borderColor: '#0891B2',
    backgroundColor: '#E0F2FE',
  },
  listButtonText: {
    color: '#11181C',
  },
  listButtonTextActive: {
    color: '#0891B2',
    fontWeight: '600',
  },
  voltageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  voltageButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voltageButtonActive: {
    borderColor: '#0891B2',
    backgroundColor: '#E0F2FE',
  },
  voltageButtonText: {
    color: '#11181C',
    fontWeight: '500',
  },
  voltageButtonTextActive: {
    color: '#0891B2',
    fontWeight: '600',
  },
});
