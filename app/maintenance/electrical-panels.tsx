import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ScrollView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import DefaultHeader from "@/components/default-header";
import { useElectricalPanelsByPropertyQuery } from "@/hooks/use-electrical-panels-by-property-query";
import type { TableroElectricoResponse } from "@/types/api";

export default function ElectricalPanelsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [building, setBuilding] = useState<any>(null);
  const [filterType, setFilterType] = useState<string | undefined>(undefined); // undefined = Todos
  const [searchTerm, setSearchTerm] = useState("");

  // Advanced Filters State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<boolean | null>(null); // null = Todos, true = Configurado, false = No Configurado
  const [filterLocations, setFilterLocations] = useState<string[]>([]);

  // Temp state for modal
  const [tempFilterConfig, setTempFilterConfig] = useState<boolean | null>(
    null
  );
  const [tempFilterLocations, setTempFilterLocations] = useState<string[]>([]);
  const [tempFilterType, setTempFilterType] = useState<string | undefined>(
    undefined
  );

  const handleOpenFilter = () => {
    setTempFilterConfig(filterConfig);
    setTempFilterLocations(filterLocations);
    setTempFilterType(filterType);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setFilterConfig(tempFilterConfig);
    setFilterLocations(tempFilterLocations);
    setFilterType(tempFilterType);
    setShowFilterModal(false);
  };

  const handleResetFilter = () => {
    setTempFilterConfig(null);
    setTempFilterLocations([]);
    setTempFilterType(undefined);
  };

  const toggleLocation = (loc: string) => {
    setTempFilterLocations((prev) => {
      const newLocs = new Set(prev);
      if (newLocs.has(loc)) {
        newLocs.delete(loc);
      } else {
        newLocs.add(loc);
      }
      return Array.from(newLocs);
    });
  };

  useEffect(() => {
    if (params.building) {
      try {
        setBuilding(JSON.parse(params.building as string));
      } catch (e) {
        console.error("Error parsing building param:", e);
      }
    }
  }, [params.building, params.equipamento]);

  // Si filterType es undefined, enviamos undefined al hook para que la API traiga todo.
  const panelTypeToSend = filterType;
  console.log("Frontend: Sending panelType to hook:", panelTypeToSend);

  const {
    data: panelsData,
    isLoading,
    isError,
    error,
  } = useElectricalPanelsByPropertyQuery(
    building?.id,
    panelTypeToSend, // Pasar el tipo de panel como filtro
    searchTerm, // Pasar el término de búsqueda
    filterConfig,
    filterLocations
  );

  const panels = panelsData || [];

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(
    new Set()
  );

  const toggleSelection = (panelId: string) => {
    const newSelected = new Set(selectedPanelIds);
    if (newSelected.has(panelId)) {
      newSelected.delete(panelId);
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      newSelected.add(panelId);
    }
    setSelectedPanelIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPanelIds.size === panels.filter((p) => p.config).length) {
      // Deselect all
      setSelectedPanelIds(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all configured
      const allConfiguredIds = panels.filter((p) => p.config).map((p) => p.id);
      setSelectedPanelIds(new Set(allConfiguredIds));
    }
  };

  const handlePanelPress = (panel: TableroElectricoResponse) => {
    if (isSelectionMode) {
      if (panel.config) {
        toggleSelection(panel.id);
      }
      return;
    }

    // Check 'config' property from DB instead of 'is_configured'
    if (!panel.config) {
      router.push({
        pathname: "/maintenance/panel-configuration",
        params: {
          panel: JSON.stringify(panel),
          building: building ? JSON.stringify(building) : "",
        },
      });
      return;
    }

    console.log(
      "Panel configurado seleccionado:",
      JSON.stringify(panel, null, 2)
    );
    // Navigate to the detail modal/screen
    router.push({
      pathname: "/maintenance/panel-detail-modal",
      params: {
        panel: JSON.stringify(panel),
      },
    });
  };

  const handlePanelLongPress = (panel: TableroElectricoResponse) => {
    if (!panel.config) return; // Ignore long press on unconfigured panels

    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedPanelIds(new Set([panel.id]));
    } else {
      toggleSelection(panel.id);
    }
  };

  const handleScheduleMaintenance = () => {
    console.log("Programar mantenimiento para:", Array.from(selectedPanelIds));
    // TODO: Navigate to schedule screen or show modal
    alert(`Programar mantenimiento para ${selectedPanelIds.size} tableros`);
  };

  const renderPanel = (panel: TableroElectricoResponse) => {
    const isSelected = selectedPanelIds.has(panel.id);

    return (
      <TouchableOpacity
        key={panel.id}
        style={[
          styles.panelCard,
          isSelected && styles.panelCardSelected,
          !panel.config && styles.notConfiguredBanner ? {} : {}, // Fix logic if needed, but keeping simple for now
        ]}
        onPress={() => handlePanelPress(panel)}
        onLongPress={() => handlePanelLongPress(panel)}
        disabled={false}
        activeOpacity={0.7}
      >
        <View style={styles.panelHeader}>
          <Text style={styles.panelName}>{panel.rotulo || panel.tipo}</Text>
          {isSelectionMode && panel.config ? (
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={24}
              color={isSelected ? "#0891B2" : "#9CA3AF"}
            />
          ) : !panel.config ? (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={16} color="#EF4444" />
            </View>
          ) : null}
        </View>

        <Text style={styles.panelFloor}>{panel.ubicacion}</Text>

        <View style={styles.panelDetails}>
          <Text style={styles.detailLabel}>Código:</Text>
          <Text style={styles.detailValue}>{panel.codigo}</Text>
        </View>

        <View style={styles.panelDetails}>
          <Text style={styles.detailLabel}>Tipo:</Text>
          <Text style={styles.detailValue}>{panel.tipo}</Text>
        </View>

        {!panel.config && (
          <View style={styles.notConfiguredBanner}>
            <Ionicons name="warning" size={14} color="#EF4444" />
            <Text style={styles.notConfiguredText}>
              Este equipo aún no está configurado.
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <DefaultHeader
          title="Tableros eléctricos"
          searchPlaceholder="Buscar por código o rótulo"
          onSearch={setSearchTerm}
          onFilterPress={handleOpenFilter}
        />

        {/* Building Info & Select All */}
        <View style={styles.buildingInfoRow}>
          <View style={styles.buildingInfo}>
            <Text style={styles.buildingName}>
              {building ? building.name : "Centro Empresarial Leuro"}
            </Text>
          </View>

          {isSelectionMode && (
            <TouchableOpacity
              onPress={handleSelectAll}
              style={styles.selectAllButton}
            >
              <Text style={styles.selectAllText}>
                {selectedPanelIds.size === panels.filter((p) => p.config).length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Panels Grid */}
        <View style={styles.panelsContainer}>
          <View style={styles.panelsGrid}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>
                  Cargando tableros eléctricos...
                </Text>
              </View>
            ) : isError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>
                  {error?.message || "Error al cargar los tableros eléctricos"}
                </Text>
              </View>
            ) : panels.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>
                  No hay tableros eléctricos disponibles con este filtro.
                </Text>
              </View>
            ) : (
              panels.map(renderPanel)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Bar for Scheduling */}
      {isSelectionMode && selectedPanelIds.size > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={handleScheduleMaintenance}
          >
            <Text style={styles.fabText}>
              Programar Mantenimiento ({selectedPanelIds.size})
            </Text>
            <Ionicons
              name="calendar"
              size={20}
              color="white"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Tableros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Panel Type Filter */}
              <Text style={styles.filterLabel}>Tipo de Tablero</Text>
              <View style={styles.filterOptions}>
                {["Todos", "Autosoportado", "Distribucion"].map((label) => {
                  const typeValue =
                    label === "Todos" ? undefined : label.toUpperCase();
                  const isActive = tempFilterType === typeValue;

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.filterOptionChip,
                        isActive && styles.activeFilterOptionChip,
                      ]}
                      onPress={() => setTempFilterType(typeValue)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          isActive && styles.activeFilterOptionText,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Config Status Filter */}
              <Text style={styles.filterLabel}>Estado de Configuración</Text>
              <View style={styles.filterOptions}>
                {[
                  { label: "Todos", value: null },
                  { label: "Configurados", value: true },
                  { label: "No Configurados", value: false },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.filterOptionChip,
                      tempFilterConfig === option.value &&
                        styles.activeFilterOptionChip,
                    ]}
                    onPress={() => setTempFilterConfig(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        tempFilterConfig === option.value &&
                          styles.activeFilterOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Filter */}
              <Text style={styles.filterLabel}>Ubicación</Text>

              <View style={styles.filterOptions}>
                {/* Option: Todos */}
                <TouchableOpacity
                  style={[
                    styles.locationCheckboxItem,
                    tempFilterLocations.length === 0 &&
                      styles.locationCheckboxSelected,
                  ]}
                  onPress={() => setTempFilterLocations([])}
                >
                  <Ionicons
                    name={
                      tempFilterLocations.length === 0
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={20}
                    color={
                      tempFilterLocations.length === 0 ? "#0891B2" : "#9CA3AF"
                    }
                  />
                  <Text
                    style={[
                      styles.locationCheckboxText,
                      tempFilterLocations.length === 0 &&
                        styles.activeLocationCheckboxText,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
              </View>

              {building?.basement > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                    Sótanos
                  </Text>
                  <View style={styles.locationGrid}>
                    {Array.from(
                      { length: building.basement },
                      (_, i) => `Sótano ${i + 1}`
                    ).map((loc) => {
                      const isSelected = tempFilterLocations.includes(loc);
                      return (
                        <TouchableOpacity
                          key={loc}
                          style={[
                            styles.locationCheckboxItem,
                            isSelected && styles.locationCheckboxSelected,
                          ]}
                          onPress={() => toggleLocation(loc)}
                        >
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={20}
                            color={isSelected ? "#0891B2" : "#9CA3AF"}
                          />
                          <Text
                            style={[
                              styles.locationCheckboxText,
                              isSelected && styles.activeLocationCheckboxText,
                            ]}
                          >
                            {loc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {building?.floor > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                    Pisos
                  </Text>
                  <View style={styles.locationGrid}>
                    {Array.from(
                      { length: building.floor },
                      (_, i) => `Piso ${i + 1}`
                    ).map((loc) => {
                      const isSelected = tempFilterLocations.includes(loc);
                      return (
                        <TouchableOpacity
                          key={loc}
                          style={[
                            styles.locationCheckboxItem,
                            isSelected && styles.locationCheckboxSelected,
                          ]}
                          onPress={() => toggleLocation(loc)}
                        >
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={20}
                            color={isSelected ? "#0891B2" : "#9CA3AF"}
                          />
                          <Text
                            style={[
                              styles.locationCheckboxText,
                              isSelected && styles.activeLocationCheckboxText,
                            ]}
                          >
                            {loc}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Extras: Azotea */}
              <View>
                <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                  Otros
                </Text>
                <TouchableOpacity
                  style={[
                    styles.locationCheckboxItem,
                    tempFilterLocations.includes("Azotea") &&
                      styles.locationCheckboxSelected,
                  ]}
                  onPress={() => toggleLocation("Azotea")}
                >
                  <Ionicons
                    name={
                      tempFilterLocations.includes("Azotea")
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={20}
                    color={
                      tempFilterLocations.includes("Azotea")
                        ? "#0891B2"
                        : "#9CA3AF"
                    }
                  />
                  <Text
                    style={[
                      styles.locationCheckboxText,
                      tempFilterLocations.includes("Azotea") &&
                        styles.activeLocationCheckboxText,
                    ]}
                  >
                    Azotea
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetFilter}
              >
                <Text style={styles.resetButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilter}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  filterOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterOptionChip: {
    backgroundColor: "#0891B2",
    borderColor: "#0891B2",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#4B5563",
  },
  activeFilterOptionText: {
    color: "white",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#0891B2",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },

  buildingInfo: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterChip: {
    backgroundColor: "#0891B2",
    borderColor: "#0891B2",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  panelsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  panelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  panelCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  panelCardDisabled: {
    opacity: 0.7,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  panelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  warningContainer: {
    marginLeft: 8,
  },
  panelFloor: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  panelDetails: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
  },
  notConfiguredBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  notConfiguredText: {
    fontSize: 12,
    color: "#EF4444",
    marginLeft: 6,
    flex: 1,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
  },
  activeNavItem: {
    // Estilo para el item activo
  },
  navText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  activeNavText: {
    color: "#0891B2",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  panelCardSelected: {
    borderColor: "#0891B2",
    borderWidth: 2,
    backgroundColor: "#F0FDFA",
  },
  buildingInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
  },
  selectAllButton: {
    padding: 8,
  },
  selectAllText: {
    color: "#0891B2",
    fontWeight: "600",
    fontSize: 14,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  fabButton: {
    flexDirection: "row",
    backgroundColor: "#0891B2",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  locationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  locationCheckboxItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: "45%",
    marginBottom: 4,
  },
  locationCheckboxSelected: {
    backgroundColor: "#F0FDFA",
    borderColor: "#0891B2",
  },
  locationCheckboxText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  activeLocationCheckboxText: {
    color: "#0891B2",
  },
});
