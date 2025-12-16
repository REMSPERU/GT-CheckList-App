import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtraConditionsStepProps } from "./_types";

type ConditionKey =
    | "mandilProteccion"
    | "puertaMandilAterrados"
    | "barraTierra"
    | "terminalesElectricos"
    | "mangasTermoContraibles"
    | "diagramaUnifilarDirectorio";

const CONDITION_OPTIONS: {
    key: ConditionKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
        { key: "mandilProteccion", label: "Mandil de protección", icon: "shield-outline" },
        { key: "puertaMandilAterrados", label: "Puerta / Mandil aterrados", icon: "log-in-outline" },
        { key: "barraTierra", label: "Barra de tierra", icon: "git-commit-outline" },
        { key: "terminalesElectricos", label: "Terminales eléctricos", icon: "flash-outline" },
        { key: "mangasTermoContraibles", label: "Mangas Termo contraíbles", icon: "color-wand-outline" },
        { key: "diagramaUnifilarDirectorio", label: "Diagrama unifilar y directorio", icon: "document-text-outline" },
    ];

export default function ExtraConditionsStep({
    panel,
    extraConditions,
    setExtraConditions,
}: ExtraConditionsStepProps) {
    const toggleCondition = (key: ConditionKey) => {
        setExtraConditions((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    return (
        <View style={styles.contentWrapper}>
            {/* Equipo */}
            <Text style={styles.equipmentLabel}>
                Equipo {panel?.name || panel?.id || ""}
            </Text>

            {/* Title */}
            <Text style={styles.stepTitleStrong}>Condiciones extras</Text>

            {/* Condition toggles */}
            <View style={styles.conditionsContainer}>
                {CONDITION_OPTIONS.map(({ key, label, icon }) => {
                    const isEnabled = extraConditions[key];

                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.conditionToggle,
                                isEnabled && styles.conditionToggleActive,
                            ]}
                            onPress={() => toggleCondition(key)}
                        >
                            <View style={styles.toggleIconRow}>
                                <Ionicons
                                    name={icon}
                                    size={24}
                                    color={isEnabled ? "#0891B2" : "#6B7280"}
                                />
                                <Text
                                    style={[
                                        styles.conditionToggleText,
                                        isEnabled && styles.conditionToggleTextActive,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </View>
                            <View style={styles.toggleRight}>
                                <View
                                    style={[
                                        styles.toggleSwitch,
                                        isEnabled && styles.toggleSwitchActive,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.toggleThumb,
                                            isEnabled && styles.toggleThumbActive,
                                        ]}
                                    />
                                </View>
                                <Text style={styles.toggleLabel}>
                                    {isEnabled ? "Sí" : "No"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
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
        marginBottom: 20,
        fontWeight: "700",
        fontSize: 18,
    },
    conditionsContainer: {
        gap: 12,
    },
    conditionToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    conditionToggleActive: {
        backgroundColor: "#F0F9FF",
        borderColor: "#0891B2",
    },
    toggleIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    conditionToggleText: {
        color: "#374151",
        fontSize: 15,
        fontWeight: "500",
        flex: 1,
    },
    conditionToggleTextActive: {
        color: "#0891B2",
        fontWeight: "600",
    },
    toggleRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    toggleSwitch: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#E5E7EB",
        padding: 2,
        justifyContent: "center",
    },
    toggleSwitchActive: {
        backgroundColor: "#0891B2",
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        alignSelf: "flex-start",
    },
    toggleThumbActive: {
        alignSelf: "flex-end",
    },
    toggleLabel: {
        color: "#6B7280",
        fontSize: 14,
        fontWeight: "500",
        minWidth: 20,
    },
});
