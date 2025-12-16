import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons";
import { CircuitsConfigStepProps, PhaseType, CableType } from "./_types";
import { useState, useEffect } from "react";

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        color: "#11181C",
        backgroundColor: "#FFFFFF",
        paddingRight: 30, // to ensure the text is never behind the icon
        height: 48,
    },
    inputAndroid: {
        fontSize: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        color: "#11181C",
        backgroundColor: "#FFFFFF",
        paddingRight: 30, // to ensure the text is never behind the icon
        height: 48,
    },
    placeholder: {
        color: "#9CA3AF",
    },
});

const PHASE_OPTIONS: { key: PhaseType; label: string }[] = [
    { key: "mono_2w", label: "Monofásico 2 hilos" },
    { key: "tri_3w", label: "Trifásico 3 hilos" },
    { key: "tri_4w", label: "Trifásico 4 hilos" },
];

const CABLE_TYPE_OPTIONS: { key: CableType; label: string }[] = [
    { key: "libre_halogeno", label: "Libre de Halógeno" },
    { key: "no_libre_halogeno", label: "No libre de Halógeno" },
];

export default function CircuitsConfigStep({
    panel,
    cnPrefix,
    setCnPrefix,
    circuitsCount,
    setCircuitsCount,
    circuits,
    setCircuits,
}: CircuitsConfigStepProps) {
    const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

    // Auto-expand new circuits when added
    useEffect(() => {
        if (circuits.length > 0) {
            setExpandedIndices((prev) => {
                const newIndices = circuits.map((_, i) => i);
                // Merge with previous to keep user preference if simple toggle?
                // Actually, just ensuring all "new" indices are added might be tricky without knowing which is new.
                // Simple approach: Add any index that isn't there if it's the last one added?
                // Let's just make sure we don't lose state on every render, but `circuits` prop changing might reset things if not careful.
                // Wait, if circuits prop updates, this effect runs.
                // Let's try to just initialize new ones.
                const currentMax = prev.length > 0 ? Math.max(...prev) : -1;
                const newItems = newIndices.filter((i) => i > currentMax);
                return [...prev, ...newItems];
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [circuits.length]);

    const toggleExpand = (index: number) => {
        setExpandedIndices((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    return (
        <View style={styles.contentWrapper}>
            {/* Equipo */}
            <Text style={styles.equipmentLabel}>
                Equipo {panel?.name || panel?.id || ""}
            </Text>

            {/* IT-G1 title */}
            <Text style={styles.stepTitleStrong}>IT-G1</Text>

            {/* Prefijo */}
            <View style={{ marginBottom: 8 }}>
                <View style={styles.labelWithIconRow}>
                    <Text style={styles.countLabel}>Ingrese el prefijo</Text>
                    <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="#6B7280"
                    />
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
                        <View style={styles.cnCardHeader}>
                            <Text style={styles.cnTitle}>
                                {cnPrefix}-{idx + 1}
                            </Text>
                            <TouchableOpacity onPress={() => toggleExpand(idx)}>
                                <Ionicons
                                    name={
                                        expandedIndices.includes(idx)
                                            ? "chevron-up"
                                            : "chevron-down"
                                    }
                                    size={20}
                                    color="#6B7280"
                                />
                            </TouchableOpacity>
                        </View>

                        {expandedIndices.includes(idx) && (
                            <View>
                                {/* ITM */}
                                <Text style={styles.cnSectionTitle}>
                                    Interruptor termomagnetico (ITM)
                                </Text>
                                <Text style={styles.cnLabel}>FASES</Text>
                                <RNPickerSelect
                                    onValueChange={(value) => {
                                        setCircuits((prev) => {
                                            const next = [...prev];
                                            next[idx] = { ...next[idx], phaseITM: value };
                                            return next;
                                        });
                                    }}
                                    items={PHASE_OPTIONS.map((opt) => ({
                                        label: opt.label,
                                        value: opt.key,
                                    }))}
                                    placeholder={{
                                        label: "Seleccione tipo de fase",
                                        value: null,
                                        color: "#9CA3AF",
                                    }}
                                    value={circuit.phaseITM}
                                    style={{
                                        ...pickerSelectStyles,
                                        iconContainer: {
                                            top: 12,
                                            right: 12,
                                        },
                                    }}
                                    useNativeAndroidPickerStyle={false}
                                    Icon={() => {
                                        return (
                                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                        );
                                    }}
                                />
                                <Text style={styles.cnLabel}>AMPARAJE:</Text>
                                <View style={styles.inputWithUnitWrapper}>
                                    <TextInput
                                        style={styles.itgInputWithUnit}
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
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.unitText}>A</Text>
                                </View>

                                {/* Diámetro */}
                                <Text style={styles.cnLabel}>DIÁMETRO:</Text>
                                <View style={styles.inputWithUnitWrapper}>
                                    <TextInput
                                        style={styles.itgInputWithUnit}
                                        value={circuit.diameter || ""}
                                        onChangeText={(text) => {
                                            setCircuits((prev) => {
                                                const next = [...prev];
                                                next[idx] = { ...next[idx], diameter: text };
                                                return next;
                                            });
                                        }}
                                        placeholder="Ingrese diámetro"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.unitText}>mm²</Text>
                                </View>

                                {/* Tipo de Cable */}
                                <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
                                <RNPickerSelect
                                    onValueChange={(value) => {
                                        setCircuits((prev) => {
                                            const next = [...prev];
                                            next[idx] = {
                                                ...next[idx],
                                                cableType: value || undefined,
                                            };
                                            return next;
                                        });
                                    }}
                                    items={CABLE_TYPE_OPTIONS.map((opt) => ({
                                        label: opt.label,
                                        value: opt.key,
                                    }))}
                                    placeholder={{
                                        label: "Seleccione una opción",
                                        value: null,
                                        color: "#9CA3AF",
                                    }}
                                    value={circuit.cableType}
                                    style={{
                                        ...pickerSelectStyles,
                                        iconContainer: {
                                            top: 12,
                                            right: 12,
                                        },
                                    }}
                                    useNativeAndroidPickerStyle={false}
                                    Icon={() => {
                                        return (
                                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                        );
                                    }}
                                />

                                {/* ID - Optional Section */}
                                <View style={{ marginTop: 12 }}>
                                    <TouchableOpacity
                                        style={[
                                            styles.toggleRow,
                                            circuit.hasID && styles.toggleRowActive,
                                        ]}
                                        onPress={() => {
                                            setCircuits((prev) => {
                                                const next = [...prev];
                                                if (next[idx].hasID) {
                                                    // Desactivar: limpiar datos de ID
                                                    next[idx] = {
                                                        ...next[idx],
                                                        hasID: false,
                                                        phaseID: undefined,
                                                        amperajeID: undefined,
                                                    };
                                                } else {
                                                    // Activar: inicializar con valores por defecto
                                                    next[idx] = {
                                                        ...next[idx],
                                                        hasID: true,
                                                        phaseID: "mono_2w",
                                                        amperajeID: "",
                                                    };
                                                }
                                                return next;
                                            });
                                        }}
                                    >
                                        <View style={styles.toggleIconRow}>
                                            <Ionicons
                                                name="shield-checkmark-outline"
                                                size={20}
                                                color={circuit.hasID ? "#0891B2" : "#6B7280"}
                                            />
                                            <Text
                                                style={[
                                                    styles.toggleLabel,
                                                    circuit.hasID && styles.toggleLabelActive,
                                                ]}
                                            >
                                                Interruptor diferencial (ID)
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.toggleSwitch,
                                                circuit.hasID && styles.toggleSwitchActive,
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.toggleThumb,
                                                    circuit.hasID && styles.toggleThumbActive,
                                                ]}
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {circuit.hasID && (
                                        <View style={{ marginTop: 12 }}>
                                            <Text style={styles.cnLabel}>FASES</Text>
                                            <RNPickerSelect
                                                onValueChange={(value) => {
                                                    setCircuits((prev) => {
                                                        const next = [...prev];
                                                        next[idx] = { ...next[idx], phaseID: value };
                                                        return next;
                                                    });
                                                }}
                                                items={PHASE_OPTIONS.map((opt) => ({
                                                    label: opt.label,
                                                    value: opt.key,
                                                }))}
                                                placeholder={{
                                                    label: "Seleccione tipo de fase",
                                                    value: null,
                                                    color: "#9CA3AF",
                                                }}
                                                value={circuit.phaseID}
                                                style={{
                                                    ...pickerSelectStyles,
                                                    iconContainer: {
                                                        top: 12,
                                                        right: 12,
                                                    },
                                                }}
                                                useNativeAndroidPickerStyle={false}
                                                Icon={() => {
                                                    return (
                                                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                                    );
                                                }}
                                            />
                                            <Text style={styles.cnLabel}>AMPARAJE:</Text>
                                            <View style={styles.inputWithUnitWrapper}>
                                                <TextInput
                                                    style={styles.itgInputWithUnit}
                                                    value={circuit.amperajeID || ""}
                                                    onChangeText={(text) => {
                                                        setCircuits((prev) => {
                                                            const next = [...prev];
                                                            next[idx] = { ...next[idx], amperajeID: text };
                                                            return next;
                                                        });
                                                    }}
                                                    placeholder="Ingrese amperaje"
                                                    placeholderTextColor="#9CA3AF"
                                                    keyboardType="numeric"
                                                />
                                                <Text style={styles.unitText}>A</Text>
                                            </View>

                                            {/* Diámetro ID */}
                                            <Text style={styles.cnLabel}>DIÁMETRO:</Text>
                                            <View style={styles.inputWithUnitWrapper}>
                                                <TextInput
                                                    style={styles.itgInputWithUnit}
                                                    value={circuit.diameterID || ""}
                                                    onChangeText={(text) => {
                                                        setCircuits((prev) => {
                                                            const next = [...prev];
                                                            next[idx] = { ...next[idx], diameterID: text };
                                                            return next;
                                                        });
                                                    }}
                                                    placeholder="Ingrese diámetro"
                                                    placeholderTextColor="#9CA3AF"
                                                    keyboardType="numeric"
                                                />
                                                <Text style={styles.unitText}>mm²</Text>
                                            </View>

                                            {/* Tipo de Cable ID */}
                                            <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
                                            <RNPickerSelect
                                                onValueChange={(value) => {
                                                    setCircuits((prev) => {
                                                        const next = [...prev];
                                                        next[idx] = {
                                                            ...next[idx],
                                                            cableTypeID: value || undefined,
                                                        };
                                                        return next;
                                                    });
                                                }}
                                                items={CABLE_TYPE_OPTIONS.map((opt) => ({
                                                    label: opt.label,
                                                    value: opt.key,
                                                }))}
                                                placeholder={{
                                                    label: "Seleccione una opción",
                                                    value: null,
                                                    color: "#9CA3AF",
                                                }}
                                                value={circuit.cableTypeID}
                                                style={{
                                                    ...pickerSelectStyles,
                                                    iconContainer: {
                                                        top: 12,
                                                        right: 12,
                                                    },
                                                }}
                                                useNativeAndroidPickerStyle={false}
                                                Icon={() => {
                                                    return (
                                                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                                                    );
                                                }}
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Suministro */}
                                <Text style={[styles.cnLabel, { marginTop: 12 }]}>
                                    ¿Qué suministra eléctricamente el Circuito {cnPrefix}-
                                    {idx + 1}?
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
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    contentWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    equipmentLabel: {
        textAlign: "center",
        color: "#6B7280",
        marginBottom: 12,
    },
    stepTitleStrong: {
        textAlign: "center",
        color: "#11181C",
        marginBottom: 12,
        fontWeight: "700",
        fontSize: 18,
    },
    labelWithIconRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    countLabel: {
        color: "#1F2937",
    },
    input: {
        height: 46,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#7DD3FC',
        paddingHorizontal: 12,
        color: "#11181C",
    },
    rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    countInput: {
        width: 80,
        height: 40,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#7DD3FC',
        paddingHorizontal: 12,
        color: "#11181C",
    },
    cnCard: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        borderRadius: 12, // Increased border radius for better look
        padding: 16, // Increased padding
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        overflow: "hidden", // Ensure content doesn't overflow when collapsing
    },
    cnCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    cnTitle: {
        fontWeight: "700",
        color: "#11181C",
        fontSize: 16,
    },
    cnSectionTitle: {
        color: "#11181C",
        fontWeight: "600",
        marginBottom: 8,
    },
    cnLabel: {
        color: "#6B7280",
        marginBottom: 6,
        fontSize: 12,
        marginTop: 4,
    },
    chipGroup: {
        flexDirection: "column", // Changed to column to fit long names
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        backgroundColor: "#F9FAFB", // Lighter background for inactive
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: "center",
    },
    chipActive: {
        borderColor: "#0891B2",
        backgroundColor: "#E0F2FE",
    },
    chipText: {
        color: "#4B5563",
        fontSize: 14,
    },
    chipTextActive: {
        color: "#0891B2",
        fontWeight: "600",
    },
    itgInput: {
        height: 44,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#7DD3FC',
        color: "#11181C",
    },
    // New styles for input with unit
    inputWithUnitWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        paddingRight: 12,
        height: 44,
        marginBottom: 4,
    },
    itgInputWithUnit: {
        flex: 1,
        height: "100%",
        paddingHorizontal: 12,
        color: "#11181C",
        borderColor: '#7DD3FC',
    },
    unitText: {
        color: "#6B7280",
        fontWeight: "500",
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    toggleRowActive: {
        borderColor: "#0891B2",
        backgroundColor: "#F0F9FF",
    },
    toggleIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    toggleLabel: {
        color: "#11181C",
        fontSize: 14,
        fontWeight: "500",
    },
    toggleLabelActive: {
        color: "#0891B2",
        fontWeight: "600",
    },
    toggleSwitch: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#E5E7EB",
        padding: 2,
        justifyContent: "center",
    },
    toggleSwitchActive: {
        backgroundColor: "#0891B2",
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        alignSelf: "flex-start",
    },
    toggleThumbActive: {
        alignSelf: "flex-end",
    },
});
