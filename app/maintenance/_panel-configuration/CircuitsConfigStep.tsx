import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons";
import {
  CircuitsConfigStepProps,
  PhaseType,
  CableType,
  CircuitConfig,
} from "@/types/panel-configuration";
import { useState, useEffect, useRef, useCallback } from "react";
import ProgressTabs from "@/components/progress-tabs";

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
    paddingRight: 30,
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
    paddingRight: 30,
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

const DEFAULT_CIRCUIT: CircuitConfig = {
  phaseITM: "mono_2w",
  amperajeITM: "",
  diameter: "",
  cableType: undefined,
  hasID: false,
  diameterID: "",
  cableTypeID: undefined,
  supply: "",
};

export default function CircuitsConfigStep({
  panel,
  itgDescriptions,
  itgCircuits,
  setItgCircuits,
  navigationHandlers,
}: CircuitsConfigStepProps) {
  const [selectedItgIndex, setSelectedItgIndex] = useState(0);

  // Navigation handlers - parent will call these instead of goNext/goBack
  const handleNext = useCallback(() => {
    if (selectedItgIndex < itgCircuits.length - 1) {
      // Go to next IT-G tab
      setSelectedItgIndex(prev => prev + 1);
      return false; // Don't proceed to next step
    } else {
      // Last IT-G, OK to go to next step
      return true;
    }
  }, [selectedItgIndex, itgCircuits.length]);

  const handleBack = useCallback(() => {
    if (selectedItgIndex > 0) {
      // Go to previous IT-G tab
      setSelectedItgIndex(prev => prev - 1);
      return false; // Don't go to previous step
    } else {
      // First IT-G, OK to go to previous step
      return true;
    }
  }, [selectedItgIndex]);

  // Expose handlers to parent via ref
  useEffect(() => {
    if (navigationHandlers) {
      navigationHandlers.current = {
        handleNext: () => handleNext(),
        handleBack: () => handleBack(),
      };
    }
  }, [navigationHandlers, handleNext, handleBack]);

  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  // Use ref to track previous circuits length to avoid infinite loop
  const prevCircuitsLengthRef = useRef<number>(0);

  const currentItg = itgCircuits[selectedItgIndex] || itgCircuits[0];
  const { cnPrefix, circuitsCount, circuits } = currentItg;

  // Auto-expand new circuits when added (optimized to prevent loop)
  useEffect(() => {
    const currentLength = circuits?.length || 0;
    const prevLength = prevCircuitsLengthRef.current;

    // Only expand if length actually increased
    if (currentLength > prevLength && currentLength > 0) {
      setExpandedIndices((prev) => {
        const newIndices = Array.from({ length: currentLength }, (_, i) => i);
        const uniqueIndices = [...new Set([...prev, ...newIndices])];
        return uniqueIndices;
      });
    }

    // Update ref
    prevCircuitsLengthRef.current = currentLength;
  }, [circuits?.length]);

  // Reset expanded indices when changing IT-G to prevent memory issues
  useEffect(() => {
    setExpandedIndices([]);
    prevCircuitsLengthRef.current = 0;
  }, [selectedItgIndex]);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateCurrentItg = (updates: Partial<typeof currentItg>) => {
    setItgCircuits((prev) => {
      const next = [...prev];
      next[selectedItgIndex] = { ...next[selectedItgIndex], ...updates };
      return next;
    });
  };

  const updateCircuitsCount = (value: string) => {
    const n = Math.max(0, parseInt(value || "0", 10));
    const newCircuits = [...circuits];

    if (n > newCircuits.length) {
      for (let i = newCircuits.length; i < n; i++) {
        newCircuits.push({ ...DEFAULT_CIRCUIT });
      }
    } else if (n < newCircuits.length) {
      newCircuits.length = n;
    }

    updateCurrentItg({ circuitsCount: value, circuits: newCircuits });
  };

  const updateCircuitAtIndex = (index: number, updates: Partial<CircuitConfig>) => {
    const newCircuits = [...circuits];
    newCircuits[index] = { ...newCircuits[index], ...updates };
    updateCurrentItg({ circuits: newCircuits });
  };

  return (
    <View style={styles.contentWrapper}>
      {/* Equipo */}
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.name || panel?.id || ""}
      </Text>

      {/* Tabs for IT-G selection - Non-clickable, navigation via buttons */}
      {itgCircuits.length > 1 && (
        <ProgressTabs
          items={itgCircuits.map((_, i) => `IT-G${i + 1}`)}
          selectedIndex={selectedItgIndex}
          onSelectIndex={() => { }} // Disabled
          disabled={true}
        />
      )}

      {/* IT-G description (title is already in tab) */}
      {itgDescriptions[selectedItgIndex] && (
        <Text style={styles.itgDescription}>{itgDescriptions[selectedItgIndex]}</Text>
      )}

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
          onChangeText={(text) => updateCurrentItg({ cnPrefix: text })}
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
          onChangeText={updateCircuitsCount}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Lista de circuitos */}
      <View style={{ marginTop: 12 }}>
        {circuits.map((circuit, idx) => (
          <View key={`cn-${selectedItgIndex}-${idx}`} style={styles.cnCard}>
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
                  onValueChange={(value) => updateCircuitAtIndex(idx, { phaseITM: value })}
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
                    onChangeText={(text) => updateCircuitAtIndex(idx, { amperajeITM: text })}
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
                    onChangeText={(text) => updateCircuitAtIndex(idx, { diameter: text })}
                    placeholder="Ingrese diámetro"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  <Text style={styles.unitText}>mm²</Text>
                </View>

                {/* Tipo de Cable */}
                <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
                <RNPickerSelect
                  onValueChange={(value) => updateCircuitAtIndex(idx, { cableType: value || undefined })}
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
                      updateCircuitAtIndex(idx, {
                        hasID: !circuit.hasID,
                        phaseID: !circuit.hasID ? "mono_2w" : undefined,
                        amperajeID: !circuit.hasID ? "" : undefined,
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
                        onValueChange={(value) => updateCircuitAtIndex(idx, { phaseID: value })}
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
                          onChangeText={(text) => updateCircuitAtIndex(idx, { amperajeID: text })}
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
                          onChangeText={(text) => updateCircuitAtIndex(idx, { diameterID: text })}
                          placeholder="Ingrese diámetro"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                        />
                        <Text style={styles.unitText}>mm²</Text>
                      </View>

                      {/* Tipo de Cable ID */}
                      <Text style={styles.cnLabel}>TIPO DE CABLE:</Text>
                      <RNPickerSelect
                        onValueChange={(value) => updateCircuitAtIndex(idx, { cableTypeID: value || undefined })}
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
                  onChangeText={(text) => updateCircuitAtIndex(idx, { supply: text })}
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
    marginBottom: 4,
    fontWeight: "700",
    fontSize: 18,
  },
  itgDescription: {
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 16,
    fontSize: 13,
    fontStyle: "italic",
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
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
  itgInput: {
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7DD3FC',
    paddingHorizontal: 12,
    color: "#11181C",
  },
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
