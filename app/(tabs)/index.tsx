import { useMemo, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import Constants from 'expo-constants';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppActionCard } from '@/components/app-action-card';
import { AppAlertModal } from '@/components/app-alert-modal';
import { BuildingSelectorModal } from '@/components/home/building-selector-modal';
import { HomeHeader } from '@/components/home/home-header';
import { LogoutConfirmModal } from '@/components/home/logout-confirm-modal';
import { useHomeScreen } from '@/hooks/use-home-screen';

interface HomeActionCard {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  onPress: () => void;
}

function HomeScreen() {
  const { height } = useWindowDimensions();
  const isTallScreen = height >= 820;

  const {
    userDisplayName,
    selectedBuilding,
    filteredBuildings,
    isLoading,
    isError,
    searchInput,
    setSearchInput,
    isBuildingModalVisible,
    isMissingBuildingAlertVisible,
    isLogoutModalVisible,
    openBuildingModal,
    closeBuildingModal,
    openLogoutModal,
    closeLogoutModal,
    closeMissingBuildingAlert,
    handleBuildingSelect,
    handleChecklistPress,
    handleScheduleMaintenancePress,
    handleExecuteMaintenancePress,
    handleReportsPress,
    handleLogoutConfirm,
  } = useHomeScreen();

  const actionCards = useMemo<HomeActionCard[]>(
    () => [
      {
        key: 'checklist',
        title: 'Checklist',
        description: 'Gestione sus tareas de inspeccion',
        icon: <Octicons name="checklist" size={24} color="#06B6D4" />,
        onPress: handleChecklistPress,
      },
      {
        key: 'schedule-maintenance',
        title: 'Programar Mantenimiento',
        description: 'Registre problemas inmediatos del equipo',
        icon: (
          <MaterialIcons name="home-repair-service" size={24} color="#06B6D4" />
        ),
        onPress: handleScheduleMaintenancePress,
      },
      {
        key: 'execute-maintenance',
        title: 'Ejecutar mantenimiento',
        description: 'Registre sus revisiones de rutina',
        icon: (
          <MaterialIcons name="home-repair-service" size={24} color="#06B6D4" />
        ),
        onPress: handleExecuteMaintenancePress,
      },
      {
        key: 'reports',
        title: 'Generar informes',
        description: 'Genera informes de mantenimiento',
        icon: <Feather name="file-text" size={24} color="#06B6D4" />,
        onPress: handleReportsPress,
      },
    ],
    [
      handleChecklistPress,
      handleExecuteMaintenancePress,
      handleReportsPress,
      handleScheduleMaintenancePress,
    ],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.statusText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar los inmuebles</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cardStyle = isTallScreen ? styles.cardTall : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader username={userDisplayName} onLogoutPress={openLogoutModal} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isTallScreen && styles.scrollContentTall,
        ]}>
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>Inmueble de trabajo</Text>
        </View>

        <AppActionCard
          title={selectedBuilding?.name || 'Seleccionar inmueble'}
          description={
            selectedBuilding?.address ||
            'Elige un inmueble una vez y luego ejecuta cualquier accion.'
          }
          icon={
            <View style={styles.selectedBuildingIconWrap}>
              <Ionicons name="business-outline" size={20} color="#06B6D4" />
            </View>
          }
          onPress={openBuildingModal}
          accessibilityLabel="Seleccionar inmueble"
          containerStyle={cardStyle}
        />

        <View style={[styles.sectionTitleWrapper, styles.actionsTitle]}>
          <Text style={styles.sectionTitle}>Que necesita hacer?</Text>
        </View>

        <View
          style={[
            styles.optionsWrapper,
            isTallScreen && styles.optionsWrapperTall,
          ]}>
          {actionCards.map(action => (
            <AppActionCard
              key={action.key}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onPress={action.onPress}
              containerStyle={cardStyle}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            v{Constants.expoConfig?.version || '1.0.0'}
          </Text>
        </View>
      </ScrollView>

      <BuildingSelectorModal
        visible={isBuildingModalVisible}
        isLoading={false}
        searchInput={searchInput}
        buildings={filteredBuildings}
        selectedBuildingId={
          selectedBuilding ? String(selectedBuilding.id) : undefined
        }
        onClose={closeBuildingModal}
        onSearchChange={setSearchInput}
        onSelectBuilding={building => {
          handleBuildingSelect(building);
          closeBuildingModal();
        }}
      />

      <LogoutConfirmModal
        visible={isLogoutModalVisible}
        onCancel={closeLogoutModal}
        onConfirm={handleLogoutConfirm}
      />

      <AppAlertModal
        visible={isMissingBuildingAlertVisible}
        title="Seleccionar inmueble"
        message="Primero selecciona un inmueble para continuar."
        onClose={closeMissingBuildingAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  scrollContentTall: {
    paddingBottom: 20,
  },
  sectionTitleWrapper: {
    marginBottom: 8,
  },
  actionsTitle: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  selectedBuildingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFEFF',
    marginRight: 12,
  },
  optionsWrapper: {
    gap: 10,
  },
  optionsWrapperTall: {
    gap: 14,
  },
  cardTall: {
    minHeight: 88,
  },
  footer: {
    alignItems: 'center',
    marginTop: 14,
    paddingBottom: 4,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
});

export default HomeScreen;
