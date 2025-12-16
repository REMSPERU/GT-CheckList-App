import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { BasicInfoStepProps } from './_types';
import { styles } from './_styles';

export default function BasicInfoStep({
    panel,
    panelType,
    setPanelType,
    voltage,
    setVoltage,
    phase,
    setPhase,
}: BasicInfoStepProps) {
    return (
        <View style={styles.contentWrapper}>
            {/* Equipo */}
            <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>

            {/* Tipo de tablero */}
            <Text style={styles.sectionTitle}>Seleccione el tipo de tablero</Text>
            <View style={styles.segmentContainer}>
                <TouchableOpacity
                    style={[styles.segment, panelType === 'adosado' && styles.segmentActive]}
                    onPress={() => setPanelType('adosado')}
                >
                    <Text style={[styles.segmentText, panelType === 'adosado' && styles.segmentTextActive]}>
                        Adosado
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segment, panelType === 'empotrado' && styles.segmentActive]}
                    onPress={() => setPanelType('empotrado')}
                >
                    <Text style={[styles.segmentText, panelType === 'empotrado' && styles.segmentTextActive]}>
                        Empotrado
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Voltaje */}
            <Text style={styles.sectionTitle}>Voltaje:</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={voltage}
                    onChangeText={setVoltage}
                    keyboardType="numeric"
                    placeholder="220"
                    placeholderTextColor="#9CA3AF"
                />
                <View style={styles.unitWrapper}>
                    <Text style={styles.unitText}>V</Text>
                </View>
            </View>

            {/* Fases */}
            <Text style={styles.sectionTitle}>Fases:</Text>
            <View style={styles.listButtons}>
                <TouchableOpacity
                    style={[styles.listButton, phase === 'mono_2w' && styles.listButtonActive]}
                    onPress={() => setPhase('mono_2w')}
                >
                    <Text style={[styles.listButtonText, phase === 'mono_2w' && styles.listButtonTextActive]}>
                        Monofásico 2 hilos (2F - 1Φ 2W)
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.listButton, phase === 'tri_3w' && styles.listButtonActive]}
                    onPress={() => setPhase('tri_3w')}
                >
                    <Text style={[styles.listButtonText, phase === 'tri_3w' && styles.listButtonTextActive]}>
                        Trifásico 3 hilos (3F - 3Φ 3W)
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.listButton, phase === 'tri_4w' && styles.listButtonActive]}
                    onPress={() => setPhase('tri_4w')}
                >
                    <Text style={[styles.listButtonText, phase === 'tri_4w' && styles.listButtonTextActive]}>
                        Trifásico 4 hilos (3F + N - 3Φ 4W)
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
