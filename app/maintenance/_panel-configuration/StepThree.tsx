import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StepThreeProps, PhaseType } from './_types';
import { styles } from './_styles';

const PHASE_OPTIONS: { key: PhaseType; label: string }[] = [
    { key: 'mono_2w', label: '1Φ 2W' },
    { key: 'tri_3w', label: '3Φ 3W' },
    { key: 'tri_4w', label: '3Φ 4W' },
];

export default function StepThree({
    panel,
    cnPrefix,
    setCnPrefix,
    circuitsCount,
    setCircuitsCount,
    circuits,
    setCircuits,
}: StepThreeProps) {
    return (
        <View style={styles.contentWrapper}>
            {/* Equipo */}
            <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.id || ''}</Text>

            {/* IT-G1 title */}
            <Text style={styles.stepTitleStrong}>IT-G1</Text>

            {/* Prefijo */}
            <View style={{ marginBottom: 8 }}>
                <View style={styles.labelWithIconRow}>
                    <Text style={styles.countLabel}>Ingrese el prefijo</Text>
                    <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                </View>
                <TextInput
                    style={styles.input}
                    value={cnPrefix}
                    onChangeText={setCnPrefix}
                    placeholder="CN, SA"
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* ¿Cuántos circuitos tienes? */}
            <View style={styles.rowBetween}>
                <Text style={styles.countLabel}>¿Cuántos circuitos tienes?</Text>
                <TextInput
                    style={styles.countInput}
                    value={circuitsCount}
                    onChangeText={setCircuitsCount}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* Lista de circuitos CN-1..N */}
            <View style={{ marginTop: 12 }}>
                {circuits.map((circuit, idx) => (
                    <View key={`cn-${idx}`} style={styles.cnCard}>
                        <Text style={styles.cnTitle}>
                            {cnPrefix}-{idx + 1}
                        </Text>

                        {/* ITM */}
                        <Text style={styles.cnSectionTitle}>Interruptor termomagnetico (ITM)</Text>
                        <Text style={styles.cnLabel}>FASES</Text>
                        <View style={styles.chipGroup}>
                            {PHASE_OPTIONS.map(({ key, label }) => (
                                <TouchableOpacity
                                    key={`itm-${idx}-${key}`}
                                    style={[styles.chip, circuit.phaseITM === key && styles.chipActive]}
                                    onPress={() => {
                                        setCircuits((prev) => {
                                            const next = [...prev];
                                            next[idx] = { ...next[idx], phaseITM: key };
                                            return next;
                                        });
                                    }}
                                >
                                    <Text style={[styles.chipText, circuit.phaseITM === key && styles.chipTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.cnLabel}>AMPARAJE:</Text>
                        <TextInput
                            style={styles.itgInput}
                            value={circuit.amperajeITM}
                            onChangeText={(text) => {
                                setCircuits((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], amperajeITM: text };
                                    return next;
                                });
                            }}
                            placeholder="Ingrese amperaje"
                            placeholderTextColor="#9CA3AF"
                        />

                        {/* ID */}
                        <Text style={[styles.cnSectionTitle, { marginTop: 12 }]}>
                            Interruptor diferencial (ID)
                        </Text>
                        <Text style={styles.cnLabel}>FASES</Text>
                        <View style={styles.chipGroup}>
                            {PHASE_OPTIONS.map(({ key, label }) => (
                                <TouchableOpacity
                                    key={`id-${idx}-${key}`}
                                    style={[styles.chip, circuit.phaseID === key && styles.chipActive]}
                                    onPress={() => {
                                        setCircuits((prev) => {
                                            const next = [...prev];
                                            next[idx] = { ...next[idx], phaseID: key };
                                            return next;
                                        });
                                    }}
                                >
                                    <Text style={[styles.chipText, circuit.phaseID === key && styles.chipTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.cnLabel}>AMPARAJE:</Text>
                        <TextInput
                            style={styles.itgInput}
                            value={circuit.amperajeID}
                            onChangeText={(text) => {
                                setCircuits((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], amperajeID: text };
                                    return next;
                                });
                            }}
                            placeholder="Ingrese amperaje"
                            placeholderTextColor="#9CA3AF"
                        />

                        {/* Suministro */}
                        <Text style={[styles.cnLabel, { marginTop: 12 }]}>
                            ¿Qué suministra eléctricamente el Circuito {cnPrefix}-{idx + 1}?
                        </Text>
                        <TextInput
                            style={styles.itgInput}
                            value={circuit.supply}
                            onChangeText={(text) => {
                                setCircuits((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], supply: text };
                                    return next;
                                });
                            }}
                            placeholder="Ingrese texto"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                ))}
            </View>
        </View>
    );
}
