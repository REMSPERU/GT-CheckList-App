import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExtraComponentsStepProps, ExtraComponentType } from "@/types/panel-configuration";
import { useState } from "react";

const COMPONENT_OPTIONS: {
    key: ExtraComponentType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
        { key: "contactores", label: "Contactores", icon: "flash-outline" },
        { key: "relays", label: "Relays", icon: "swap-horizontal-outline" },
        { key: "ventiladores", label: "Ventiladores", icon: "options-outline" },
        { key: "termostato", label: "Termostato", icon: "thermometer-outline" },
        { key: "medidores", label: "Medidores", icon: "speedometer-outline" },
        { key: "timers", label: "Timers", icon: "time-outline" },
    ];

export default function ExtraComponentsStep({
    panel,
    enabledComponents,
    setEnabledComponents,
    extraComponents,
    setExtraComponents,
}: ExtraComponentsStepProps) {
    const [expandedComponents, setExpandedComponents] = useState<
        ExtraComponentType[]
    >([]);

    const toggleComponent = (key: ExtraComponentType) => {
        if (enabledComponents.includes(key)) {
            // Desactivar: borramos del array de enabled y limpiamos sus datos
            setEnabledComponents((prev) => prev.filter((k) => k !== key));
            setExtraComponents((prev) => ({
                ...prev,
                [key]: [],
            }));
            // También quitamos de expandidos
            setExpandedComponents((prev) => prev.filter((k) => k !== key));
        } else {
            // Activar: agregamos a enabled y agregamos 1 item por defecto
            setEnabledComponents((prev) => [...prev, key]);
            const newId = `${key.substring(0, 2).toUpperCase()}-1`;
            setExtraComponents((prev) => ({
                ...prev,
                [key]: [{ id: newId, description: "" }],
            }));
            // Expandimos automáticamente
            setExpandedComponents((prev) => [...prev, key]);
        }
    };

    const toggleExpand = (key: ExtraComponentType) => {
        if (expandedComponents.includes(key)) {
            setExpandedComponents((prev) => prev.filter((k) => k !== key));
        } else {
            setExpandedComponents((prev) => [...prev, key]);
        }
    };

    const updateQuantity = (key: ExtraComponentType, value: string) => {
        const num = parseInt(value || "0", 10);
        const quantity = isNaN(num) ? 0 : Math.max(0, num);

        setExtraComponents((prev) => {
            const current = prev[key];
            const prefix = key.substring(0, 2).toUpperCase();

            if (quantity > current.length) {
                // Agregar items
                const newItems = [];
                for (let i = current.length; i < quantity; i++) {
                    newItems.push({ id: `${prefix}-${i + 1}`, description: "" });
                }
                return { ...prev, [key]: [...current, ...newItems] };
            } else if (quantity < current.length) {
                // Remover items
                return { ...prev, [key]: current.slice(0, quantity) };
            }
            return prev;
        });
    };

    const updateComponentDescription = (
        key: ExtraComponentType,
        index: number,
        description: string
    ) => {
        setExtraComponents((prev) => ({
            ...prev,
            [key]: prev[key].map((item, i) =>
                i === index ? { ...item, description } : item
            ),
        }));
    };

    return (
        <View style={styles.contentWrapper}>
            {/* Equipo */}
            <Text style={styles.equipmentLabel}>
                Equipo {panel?.name || panel?.id || ""}
            </Text>

            {/* Title */}
            <Text style={styles.stepTitleStrong}>Componentes Extras</Text>
            <Text style={styles.sectionTitleWithMargin}>
                Seleccione los componentes adicionales del tablero
            </Text>

            {/* Component toggles with their sections */}
            <View style={styles.componentContainer}>
                {COMPONENT_OPTIONS.map(({ key, label, icon }) => {
                    const isEnabled = enabledComponents.includes(key);
                    const isExpanded = expandedComponents.includes(key);
                    const components = extraComponents[key];

                    return (
                        <View key={key}>
                            {/* Toggle Header */}
                            <TouchableOpacity
                                style={[
                                    styles.componentToggle,
                                    isEnabled && styles.componentToggleActive,
                                ]}
                                onPress={() => toggleComponent(key)}
                            >
                                <View style={styles.toggleIconRow}>
                                    <Ionicons
                                        name={icon}
                                        size={24}
                                        color={isEnabled ? "#0891B2" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.componentToggleText,
                                            isEnabled && styles.componentToggleTextActive,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </View>
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
                            </TouchableOpacity>

                            {/* Component Section */}
                            {isEnabled && (
                                <View style={styles.componentSectionContainer}>
                                    {/* Quantity Header */}
                                    <View style={styles.quantityHeader}>
                                        <Text style={styles.quantityLabel}>
                                            Seleccione la cantidad
                                        </Text>
                                        <View style={styles.quantityControls}>
                                            <TextInput
                                                style={styles.quantityInputNumber}
                                                value={components.length.toString()}
                                                onChangeText={(text) => updateQuantity(key, text)}
                                                keyboardType="numeric"
                                            />

                                            <TouchableOpacity
                                                style={styles.collapseButton}
                                                onPress={() => toggleExpand(key)}
                                            >
                                                <Ionicons
                                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                                    size={18}
                                                    color="#6B7280"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Component List */}
                                    {isExpanded && components.length > 0 && (
                                        <View style={styles.componentList}>
                                            {components.map((component, index) => (
                                                <View
                                                    key={`${key}-${index}`}
                                                    style={styles.componentItemRow}
                                                >
                                                    <View style={styles.componentIdBadge}>
                                                        <Ionicons name={icon} size={14} color="#0891B2" />
                                                        <Text style={styles.componentIdText}>
                                                            {component.id}
                                                        </Text>
                                                    </View>
                                                    <TextInput
                                                        style={styles.componentInputRight}
                                                        value={component.description}
                                                        onChangeText={(text) =>
                                                            updateComponentDescription(key, index, text)
                                                        }
                                                        placeholder="Descripción"
                                                        placeholderTextColor="#9CA3AF"
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            {enabledComponents.length === 0 && (
                <View style={styles.emptyStateMain}>
                    <Ionicons name="construct-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateMainText}>
                        No hay componentes extras seleccionados
                    </Text>
                    <Text style={styles.emptyStateText}>
                        Active los componentes que desee agregar
                    </Text>
                </View>
            )}
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
    sectionTitleWithMargin: {
        textAlign: "center",
        color: "#1F2937",
        marginBottom: 16,
        fontWeight: "600",
    },
    componentContainer: {
        gap: 16,
    },
    componentToggle: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF", // Light blue background for toggle
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        zIndex: 1,
    },
    componentToggleActive: {
        backgroundColor: "#E0F2FE",
        borderColor: "#0891B2",
    },
    toggleIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    componentToggleText: {
        color: "#0891B2",
        fontSize: 16,
        fontWeight: "600",
    },
    componentToggleTextActive: {
        color: "#0891B2",
        fontWeight: "700",
    },
    toggleSwitch: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
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
        backgroundColor: "#E5E7EB",
        alignSelf: "flex-start",
    },
    toggleThumbActive: {
        backgroundColor: "#FFFFFF",
        alignSelf: "flex-end",
    },
    componentSectionContainer: {
        marginTop: -4, // Overlap slightly or connect visually
        backgroundColor: "#F3F4F6", // Gray background for the body
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 16,
        paddingTop: 24, // Compensation for top connection
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: "#E5E7EB",
    },
    quantityHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    quantityLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0891B2",
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    quantityInputNumber: {
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        width: 50,
        height: 36,
        textAlign: "center",
        fontSize: 14,
        fontWeight: "600",
        color: "#11181C",
    },
    controlButton: {
        width: 36,
        height: 36,
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },
    collapseButton: {
        marginLeft: 4,
    },
    componentList: {
        gap: 12,
    },
    componentItemRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        gap: 12,
    },
    componentIdBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#E0F2FE",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 80,
        justifyContent: "center",
    },
    componentIdText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#0891B2",
    },
    componentInputRight: {
        flex: 1,
        height: 42,
        backgroundColor: "#F9FAFB",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 12,
        color: "#11181C",
        fontSize: 14,
    },
    emptyStateMain: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 24,
        marginTop: 24,
    },
    emptyStateMainText: {
        color: "#9CA3AF",
        fontSize: 16,
        textAlign: "center",
        marginTop: 8,
    },
    emptyStateText: {
        color: "#9CA3AF",
        fontSize: 13,
        textAlign: "center",
        marginTop: 4,
    },
});
