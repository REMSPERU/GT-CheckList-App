import { View, Text } from "react-native";
import { ReviewStepProps, ExtraComponentType } from "@/types/panel-configuration";
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
    itgCircuits,
    enabledComponents,
    extraComponents,
    extraConditions,
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

            {/* IT-G Circuits Summary */}
            <Text
                style={[styles.sectionTitle, { marginTop: 16, marginBottom: 12 }]}
            >
                Circuitos por IT-G
            </Text>
            {itgCircuits.map((itgCircuit, index) => (
                <View key={index} style={{ marginBottom: 12 }}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>
                            IT-G{index + 1} ({itgCircuit.cnPrefix}):
                        </Text>
                        <Text style={styles.summaryValue}>{itgCircuit.circuits.length} circuitos</Text>
                    </View>
                    {itgCircuit.circuits.map((c, i) => (
                        <View key={`${index}-${i}`} style={[styles.summaryRow, { marginLeft: 16 }]}>
                            <Text style={styles.summaryLabel}>
                                {itgCircuit.cnPrefix}-{i + 1}:
                            </Text>
                            <Text style={styles.summaryValue}>{c.supply || "—"}</Text>
                        </View>
                    ))}
                </View>
            ))}

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

            {/* Extra Conditions Summary */}
            <Text
                style={[styles.sectionTitle, { marginTop: 16, marginBottom: 12 }]}
            >
                Condiciones Extras
            </Text>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mandil de protección:</Text>
                <Text style={styles.summaryValue}>{extraConditions.mandilProteccion ? "Sí" : "No"}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Puerta/Mandil aterrados:</Text>
                <Text style={styles.summaryValue}>{extraConditions.puertaMandilAterrados ? "Sí" : "No"}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Barra de tierra:</Text>
                <Text style={styles.summaryValue}>{extraConditions.barraTierra ? "Sí" : "No"}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Terminales eléctricos:</Text>
                <Text style={styles.summaryValue}>{extraConditions.terminalesElectricos ? "Sí" : "No"}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mangas Termo contraíbles:</Text>
                <Text style={styles.summaryValue}>{extraConditions.mangasTermoContraibles ? "Sí" : "No"}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diagrama unifilar:</Text>
                <Text style={styles.summaryValue}>{extraConditions.diagramaUnifilarDirectorio ? "Sí" : "No"}</Text>
            </View>
        </View>
    );
}
