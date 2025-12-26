import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function ScheduleMaintenanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedCount = params.count ? Number(params.count) : 0;
  const buildingName = params.buildingName
    ? (params.buildingName as string)
    : "Centro Empresarial";

  const [date] = useState("12/10/2025");
  const [time] = useState("12:00 PM");
  const [maintenanceType, setMaintenanceType] = useState<
    "preventive" | "corrective"
  >("preventive");
  const [technicians] = useState([
    { id: 1, name: "Juan Peréz", company: "Rems" },
  ]);
  const [observations, setObservations] = useState("");
  const [isTechniciansExpanded, setIsTechniciansExpanded] = useState(true);

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
          {/* Background image placeholder or gradient */}
          <View style={styles.bannerOverlay} />
          {/* You might want to use a real image here if available */}
          {/* <Image source={...} style={styles.bannerImage} /> */}
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
          <TouchableOpacity style={styles.inputCard}>
            <View style={styles.inputLabelRow}>
              <Ionicons name="calendar-outline" size={20} color="#374151" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.inputLabel}>Fecha Tentativa</Text>
                <Text style={styles.inputValue}>{date}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={{ width: 12 }} />

          <TouchableOpacity style={styles.inputCard}>
            <View style={styles.inputLabelRow}>
              <Ionicons name="time-outline" size={20} color="#374151" />
              <View style={styles.dateTextContainer}>
                <Text style={styles.inputLabel}>Hora Tentativa</Text>
                {/* Typo in original design '12/10/2025' for time, assuming typo */}
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
              maintenanceType === "preventive" && styles.typeButtonActive,
            ]}
            onPress={() => setMaintenanceType("preventive")}
          >
            <Text
              style={[
                styles.typeButtonText,
                maintenanceType === "preventive" && styles.typeButtonTextActive,
              ]}
            >
              Preventivo
            </Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity
            style={[
              styles.typeButton,
              maintenanceType === "corrective" && styles.typeButtonActive,
            ]}
            onPress={() => setMaintenanceType("corrective")}
          >
            <Text
              style={[
                styles.typeButtonText,
                maintenanceType === "corrective" && styles.typeButtonTextActive,
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
            <TouchableOpacity style={styles.addTechnicianButton}>
              <Ionicons name="add" size={16} color="#374151" />
              <Text style={styles.addTechnicianText}>Asignar técnicos</Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>

            {technicians.map((tech) => (
              <View key={tech.id} style={styles.technicianRow}>
                <View style={styles.techIconContainer}>
                  <Ionicons name="person-outline" size={20} color="#374151" />
                </View>
                <Text style={styles.techName}>{tech.name}</Text>
                <Text style={styles.techCompany}>{tech.company}</Text>
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
        <TouchableOpacity style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Confirmar Programación</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
});
