import { View, Text } from "react-native";
import { ReviewStepProps, ExtraComponentType } from "./_types";
import { styles } from "./_styles";

const getPhaseLabel = (phase: string): string => {
    switch (phase) {
        case "mono_2w":
            return "Monofásico 2 hilos";
        case "tri_3w":
            return "Trifásico 3 hilos";
        case "tri_4w":
            return "Trifásico 4 hilos";
        default:
            return phase;
    }
};

const COMPONENT_LABELS: Record<ExtraComponentType, string> = {
    contactores: "Contactores",
    relays: "Relays",
    ventiladores: "Ventiladores",
    termostato: "Termostato",
    medidores: "Medidores",
    timers: "Timers",
};

export default function ReviewStep({
    panel,
    panelType,
    voltage,
    phase,
    itgDescriptions,
    cnPrefix,
    circuits,
    enabledComponents,
    extraComponents,
}: ReviewStepProps) {
    return (
        <View style={styles.contentWrapper}>
            <Text style={styles.sectionTitle}>Resumen</Text>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Equipo:</Text>
                <Text style={styles.summaryValue}>{panel?.name || panel?.id}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tipo:</Text>
                <Text style={styles.summaryValue}>
                    {panelType === "adosado" ? "Adosado" : "Empotrado"}
                </Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Voltaje:</Text>
                <Text style={styles.summaryValue}>{voltage} V</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fases:</Text>
                <Text style={styles.summaryValue}>{getPhaseLabel(phase)}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IT-G:</Text>
                <Text style={styles.summaryValue}>{itgDescriptions.length}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prefijo circuitos:</Text>
                <Text style={styles.summaryValue}>{cnPrefix}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cantidad circuitos:</Text>
                <Text style={styles.summaryValue}>{circuits.length}</Text>
            </View>

            {/* Extra Components Summary */}
            {enabledComponents.length > 0 && (
                <>
                    <Text
                        style={[styles.sectionTitle, { marginTop: 16, marginBottom: 12 }]}
                    >
                        Componentes Extras
                    </Text>
                    {enabledComponents.map((type) => {
                        const components = extraComponents[type];
                        if (components.length === 0) return null;

                        return (
                            <View key={type} style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>
                                    {COMPONENT_LABELS[type]}:
                                </Text>
                                <Text style={styles.summaryValue}>{components.length}</Text>
                            </View>
                        );
                    })}
                </>
            )}

            {/* Circuits Detail */}
            <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                    Detalle de Circuitos
                </Text>
                {circuits.map((c, i) => (
                    <View key={`sum-cn-${i}`} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                            {cnPrefix}-{i + 1}:
                        </Text>
                        <Text style={styles.summaryValue}>{c.supply || "—"}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
