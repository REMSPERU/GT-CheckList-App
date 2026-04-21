import { useMemo, type ReactNode } from 'react';
import Constants from 'expo-constants';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
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
import { BuildingHeroCard } from '@/components/home/building-hero-card';
import { BuildingSelectorModal } from '@/components/home/building-selector-modal';
import { HomeHeader } from '@/components/home/home-header';
import { LogoutConfirmModal } from '@/components/home/logout-confirm-modal';
import { useHomeScreen } from '@/hooks/use-home-screen';
import { useUserRole } from '@/hooks/use-user-role';

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
  const appVersion = Constants.expoConfig?.version ?? '1.0.36';
  const { isAdmin, isSupervisor, isTechnician, canAudit } = useUserRole();

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
    handleAuditPress,
    handleReportsPress,
    handleChangePasswordPress,
    handleLogoutConfirm,
  } = useHomeScreen();

  const actionCards = useMemo<HomeActionCard[]>(() => {
    const cards: HomeActionCard[] = [];

    const canSeeChecklist = isAdmin;
    const canSeeSchedule = isTechnician || isSupervisor;
    const canSeeExecute = isTechnician || isSupervisor;
    const canSeeReports = isSupervisor;

    if (canSeeChecklist) {
      cards.push({
        key: 'checklist',
        title: 'Checklist',
        description: 'Gestione sus tareas de inspeccion',
        icon: <Octicons name="checklist" size={24} color="#06B6D4" />,
        onPress: handleChecklistPress,
      });
    }

    if (canSeeSchedule) {
      cards.push({
        key: 'schedule-maintenance',
        title: 'Programar Mantenimiento',
        description: 'Registre problemas inmediatos del equipo',
        icon: (
          <MaterialIcons name="home-repair-service" size={24} color="#06B6D4" />
        ),
        onPress: handleScheduleMaintenancePress,
      });
    }

    if (canSeeExecute) {
      cards.push({
        key: 'execute-maintenance',
        title: 'Ejecutar mantenimiento',
        description: 'Registre sus revisiones de rutina',
        icon: (
          <MaterialIcons name="home-repair-service" size={24} color="#06B6D4" />
        ),
        onPress: handleExecuteMaintenancePress,
      });
    }

    if (canAudit) {
      cards.push({
        key: 'auditoria',
        title: 'Auditoria',
        description: 'Audite el inmueble por preguntas globales',
        icon: <Feather name="clipboard" size={24} color="#06B6D4" />,
        onPress: handleAuditPress,
      });
    }

    if (canSeeReports) {
      cards.push({
        key: 'reports',
        title: 'Generar informes',
        description: 'Genera informes de mantenimiento',
        icon: <Feather name="file-text" size={24} color="#06B6D4" />,
        onPress: handleReportsPress,
      });
    }

    return cards;
  }, [
    canAudit,
    isAdmin,
    isSupervisor,
    isTechnician,
    handleChecklistPress,
    handleAuditPress,
    handleExecuteMaintenancePress,
    handleReportsPress,
    handleScheduleMaintenancePress,
  ]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <Text style={styles.statusText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error al cargar los inmuebles</Text>
        </View>
      </SafeAreaView>
    );
  }

  const actionCardStyle = [isTallScreen && styles.cardTall];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <HomeHeader
        username={userDisplayName}
        onChangePasswordPress={handleChangePasswordPress}
        onLogoutPress={openLogoutModal}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isTallScreen && styles.scrollContentTall,
        ]}>
        <View style={[styles.sectionTitleWrapper, styles.sectionTitleRow]}>
          <Text style={styles.sectionTitle}>Inmueble de trabajo</Text>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>

        <BuildingHeroCard
          building={selectedBuilding}
          onPress={openBuildingModal}
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
              containerStyle={actionCardStyle}
            />
          ))}
        </View>
      </ScrollView>

      <BuildingSelectorModal
        visible={isBuildingModalVisible}
        isLoading={isLoading}
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
  },
  scrollContent: {
    paddingBottom: 8,
  },
  scrollContentTall: {
    paddingBottom: 10,
  },
  sectionTitleWrapper: {
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsTitle: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
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
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    opacity: 0.85,
  },
});

export default HomeScreen;
