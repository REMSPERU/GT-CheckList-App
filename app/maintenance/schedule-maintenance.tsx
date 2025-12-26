import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTechnicians, useCreateMaintenance } from "@/hooks/use-maintenance";
import { MaintenanceTypeEnum } from "@/types/api";

export default function ScheduleMaintenanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedCount = params.count ? Number(params.count) : 0;
  const buildingName = params.buildingName
    ? (params.buildingName as string)
    : "Centro Empresarial";

  // State
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState("12:00 PM"); // String for simplicity in custom picker
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [maintenanceType, setMaintenanceType] = useState<MaintenanceTypeEnum>(
    MaintenanceTypeEnum.PREVENTIVO
  );
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [isTechniciansExpanded, setIsTechniciansExpanded] = useState(true);
  const [showTechModal, setShowTechModal] = useState(false);

  // Queries & Mutations
  const { data: technicians = [], isLoading: loadingTechs } = useTechnicians();
  const createMaintenanceMutation = useCreateMaintenance();

  // Date Logic
  const handleDateConfirm = (selectedDate: Date) => {
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  // Time Logic
  const times = Array.from({ length: 24 * 2 }).map((_, i) => {
    const totalMinutes = i * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const period = h < 12 ? "AM" : "PM";
    const displayH = h % 12 || 12;
    const displayM = m === 0 ? "00" : m;
    return `${displayH}:${displayM} ${period}`;
  });

  const handleCreate = async () => {
    try {
      await createMaintenanceMutation.mutateAsync({
        // Mock IDs if not passed
        panel_ids: ["mock-panel-id-1"],
        dia_programado: date.toISOString(),
        hora_programada: time,
        tipo_mantenimiento: maintenanceType,
        assigned_technicians: selectedTechnicians,
        observations,
      });
      Alert.alert("Éxito", "Mantenimiento programado correctamente", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo programar el mantenimiento");
      console.error(error);
    }
  };

  const toggleTechnician = (id: string) => {
    setSelectedTechnicians((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#0891B2" />
        </TouchableOpacity>
        <Ionicons
          name="construct-outline"
          size={24}
          color="#0891B2"
          style={styles.headerIcon}
        />
        <Text style={styles.headerTitle}>Programar Mantenimiento</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerOverlay} />
          <Text style={styles.bannerText}>{buildingName}</Text>
        </View>

        {/* Selected Panels */}
        <Text style={styles.sectionTitle}>Paneles Seleccionados</Text>
        <View style={styles.card}>
          <Text style={styles.selectedCountText}>
            {selectedCount} paneles seleccionados
          </Text>
          <TouchableOpacity onPress={() => console.log("Ver lista")}>
            <Text style={styles.linkText}>Ver lista completa / Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Maintenance Details */}
        <Text style={styles.sectionTitle}>Detalles del Mantenimiento</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.inputLabelRow}>
              <Ionicons name="calendar-outline" size={20} color="#374151" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.inputLabel}>Fecha Tentativa</Text>
                <Text style={styles.inputValue}>
                  {date.toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={{ width: 12 }} />

          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => setShowTimePicker(true)}
          >
            <View style={styles.inputLabelRow}>
              <Ionicons name="time-outline" size={20} color="#374151" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.inputLabel}>Hora Tentativa</Text>
                <Text style={styles.inputValue}>{time}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Type of Maintenance */}
        <Text style={styles.sectionTitle}>Tipo de Mantenimiento</Text>
        <View style={styles.typeSelectorContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              maintenanceType === MaintenanceTypeEnum.PREVENTIVO &&
                styles.typeButtonActive,
            ]}
            onPress={() => setMaintenanceType(MaintenanceTypeEnum.PREVENTIVO)}
          >
            <Text
              style={[
                styles.typeButtonText,
                maintenanceType === MaintenanceTypeEnum.PREVENTIVO &&
                  styles.typeButtonTextActive,
              ]}
            >
              Preventivo
            </Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity
            style={[
              styles.typeButton,
              maintenanceType === MaintenanceTypeEnum.CORRECTIVO &&
                styles.typeButtonActive,
            ]}
            onPress={() => setMaintenanceType(MaintenanceTypeEnum.CORRECTIVO)}
          >
            <Text
              style={[
                styles.typeButtonText,
                maintenanceType === MaintenanceTypeEnum.CORRECTIVO &&
                  styles.typeButtonTextActive,
              ]}
            >
              Correctivo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Assigned Technicians */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setIsTechniciansExpanded(!isTechniciansExpanded)}
        >
          <Text style={styles.accordionTitle}>Técnicos Asignados</Text>
          <Ionicons
            name={isTechniciansExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>

        {isTechniciansExpanded && (
          <View style={styles.techniciansContainer}>
            <TouchableOpacity
              style={styles.addTechnicianButton}
              onPress={() => setShowTechModal(true)}
            >
              <Ionicons name="add" size={16} color="#374151" />
              <Text style={styles.addTechnicianText}>Asignar técnicos</Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>

            {technicians
              .filter((t) => selectedTechnicians.includes(t.id))
              .map((tech) => (
                <View key={tech.id} style={styles.technicianRow}>
                  <View style={styles.techIconContainer}>
                    <Ionicons name="person-outline" size={20} color="#374151" />
                  </View>
                  <Text style={styles.techName}>{tech.username}</Text>
                  {/* Assuming 'company' or similar field exists or we simulate it */}
                  <Text style={styles.techCompany}>Rems</Text>
                  <TouchableOpacity onPress={() => toggleTechnician(tech.id)}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}

        {/* Observations */}
        <Text style={styles.sectionTitle}>Observacion</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Observaciones/Notas"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          value={observations}
          onChangeText={setObservations}
          textAlignVertical="top"
        />

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            createMaintenanceMutation.isPending && styles.disabledButton,
          ]}
          onPress={handleCreate}
          disabled={createMaintenanceMutation.isPending}
        >
          <Text style={styles.confirmButtonText}>
            {createMaintenanceMutation.isPending
              ? "Programando..."
              : "Confirmar Programación"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Modal (Simplified Custom) */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
            {/* Simple list of next 30 days for demo "good UI" without native dep complexity */}
            <ScrollView style={{ maxHeight: 300 }}>
              {Array.from({ length: 30 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const isSelected = d.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => handleDateConfirm(d)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextSelected,
                      ]}
                    >
                      {d.toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#0891B2" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Hora</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {times.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.modalOption,
                    time === t && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setTime(t);
                    setShowTimePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      time === t && styles.modalOptionTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                  {time === t && (
                    <Ionicons name="checkmark" size={20} color="#0891B2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Technician Picker Modal */}
      <Modal
        visible={showTechModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTechModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar Técnicos</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {loadingTechs ? (
                <Text style={{ padding: 20, textAlign: "center" }}>
                  Cargando...
                </Text>
              ) : (
                technicians.map((t) => {
                  const isSelected = selectedTechnicians.includes(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionSelected,
                      ]}
                      onPress={() => toggleTechnician(t.id)}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={[
                            styles.techIconContainer,
                            {
                              borderColor: isSelected ? "#0891B2" : "#374151",
                              width: 24,
                              height: 24,
                              borderWidth: 1,
                              marginRight: 8,
                            },
                          ]}
                        >
                          <Ionicons
                            name="person"
                            size={14}
                            color={isSelected ? "#0891B2" : "#374151"}
                          />
                        </View>
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && styles.modalOptionTextSelected,
                          ]}
                        >
                          {t.username}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#0891B2"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTechModal(false)}
            >
              <Text style={styles.modalCloseText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  bannerContainer: {
    height: 80,
    backgroundColor: "#B91C1C", // Red color from image
    justifyContent: "center",
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)", // subtle overlay
    // Add gradient or image here if needed
  },
  bannerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  selectedCountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  linkText: {
    fontSize: 14,
    color: "#0891B2",
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  inputCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateTextContainer: {
    //
  },
  inputLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  inputValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  typeSelectorContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  typeButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    alignItems: "center",
  },
  typeButtonActive: {
    borderColor: "#0891B2",
    backgroundColor: "#FFFFFF",
    // borderBottomWidth: 2, // If tab style, but button style implies full border
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  typeButtonTextActive: {
    color: "#0891B2",
    fontWeight: "600",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 20,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  techniciansContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  addTechnicianButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  addTechnicianText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  technicianRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  techIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  techName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  techCompany: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginHorizontal: 16,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#1F2937",
    height: 100,
  },
  confirmButton: {
    backgroundColor: "#0891B2",
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalOptionSelected: {
    backgroundColor: "#F0FDFA",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  modalOptionTextSelected: {
    color: "#0891B2",
    fontWeight: "500",
  },
  modalCloseButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCloseText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "500",
  },
});
