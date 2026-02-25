import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { FormProvider } from 'react-hook-form';
import DefaultHeader from '@/components/default-header';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DatabaseService } from '@/services/database';
import {
  usePanelConfiguration,
  STEP_IDS,
  isLastStep,
  isFirstStep,
  StepId,
} from '@/hooks/use-electrical-panel-configuration';
import { PanelData, CircuitsConfigStepRef } from '@/types/panel-configuration';
import { styles } from './_config-steps/_styles';
import BasicInfoStep from './_config-steps/BasicInfoStep';
import ITGConfigStep from './_config-steps/ITGConfigStep';
import CircuitsConfigStep from './_config-steps/CircuitsConfigStep';
import ExtraComponentsStep from './_config-steps/ExtraComponentsStep';
import ExtraConditionsStep from './_config-steps/ExtraConditionsStep';
import ReviewStep from './_config-steps/ReviewStep';

// ── Extracted NavigationFooter ──────────────────────────────────────────────
// Eliminates 3x duplicated JSX blocks and memoizes to avoid re-renders when
// only the step content changes.
interface NavigationFooterProps {
  currentStepId: StepId;
  onNext: () => void;
  onBack: () => void;
}

const NavigationFooter = memo(function NavigationFooter({
  currentStepId,
  onNext,
  onBack,
}: NavigationFooterProps) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.primaryBtn} onPress={onNext}>
        <Text style={styles.primaryBtnText}>
          {isLastStep(currentStepId) ? 'Guardar' : 'Siguiente'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
        <Text style={styles.secondaryBtnText}>
          {isFirstStep(currentStepId) ? 'Cancel' : 'Atras'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ── Static style constants (avoid re-creating objects each render) ──────────
const flexOneStyle = { flex: 1 } as const;
const loadingContainerStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
} as const;
const loadingTextStyle = { marginTop: 16 } as const;

export default function PanelConfigurationScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [panel, setPanel] = useState<PanelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch panel data from local database using panelId
  useEffect(() => {
    async function loadPanel() {
      try {
        if (params.panelId) {
          const data = await DatabaseService.getEquipmentById(
            params.panelId as string,
          );
          setPanel(data as PanelData);
        } else if (params.panel) {
          // Fallback for stringified panel object
          setPanel(JSON.parse(params.panel as string));
        } else {
          setPanel({
            id: 'N/A',
            codigo: 'N/A',
            equipment_detail: { rotulo: 'Equipo' },
          });
        }
      } catch (err) {
        if (__DEV__) console.error('Failed to parse or load panel:', err);
        setPanel({
          id: 'N/A',
          codigo: 'N/A',
          equipment_detail: { rotulo: 'Equipo' },
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadPanel();
  }, [params.panelId, params.panel]);

  // Ref to hold custom navigation handlers from CircuitsConfigStep
  const circuitsNavHandlersRef = useRef<CircuitsConfigStepRef | null>(null);

  const isEditMode = params.isEditMode === 'true';
  const { currentStepId, form, goNext, goBack } = usePanelConfiguration(
    panel,
    isEditMode,
  );

  // Custom navigation for Circuits step — wrapped in useCallback so
  // NavigationFooter (memo) doesn't re-render when only step content changes.
  const handleGoNext = useCallback(async () => {
    if (currentStepId === STEP_IDS.CIRCUITS && circuitsNavHandlersRef.current) {
      const canProceed = await circuitsNavHandlersRef.current.handleNext();
      if (canProceed) {
        goNext();
      }
    } else {
      goNext();
    }
  }, [currentStepId, goNext]);

  const handleGoBack = useCallback(() => {
    if (currentStepId === STEP_IDS.CIRCUITS && circuitsNavHandlersRef.current) {
      const canGoBack = circuitsNavHandlersRef.current.handleBack();
      if (canGoBack) {
        goBack();
      }
    } else {
      goBack();
    }
  }, [currentStepId, goBack]);

  // Memoize the rendered step to avoid re-creating JSX on every parent
  // re-render when currentStepId hasn't changed.
  const renderedStep = useMemo(() => {
    switch (currentStepId) {
      case STEP_IDS.BASIC_INFO:
        return <BasicInfoStep panel={panel} />;
      case STEP_IDS.ITG_CONFIG:
        return <ITGConfigStep panel={panel} />;
      case STEP_IDS.CIRCUITS:
        return (
          <CircuitsConfigStep panel={panel} ref={circuitsNavHandlersRef} />
        );
      case STEP_IDS.EXTRA_COMPONENTS:
        return <ExtraComponentsStep panel={panel} />;
      case STEP_IDS.EXTRA_CONDITIONS:
        return <ExtraConditionsStep panel={panel} />;
      case STEP_IDS.REVIEW:
        return <ReviewStep panel={panel} />;
      default:
        return null;
    }
  }, [currentStepId, panel]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <DefaultHeader title="Configuracion del equipo" searchPlaceholder="" />
        <View style={loadingContainerStyle}>
          <ActivityIndicator size="large" color="#0891B2" />
          <Text style={loadingTextStyle}>Cargando informacion...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary
      fallbackMessage="Ocurrio un error en la configuracion. Sus datos se guardaron como borrador."
      onReset={() => router.back()}>
      <SafeAreaView style={styles.container}>
        <FormProvider {...form}>
          {currentStepId === STEP_IDS.CIRCUITS ? (
            Platform.OS === 'ios' ? (
              <KeyboardAvoidingView
                style={flexOneStyle}
                behavior="padding"
                keyboardVerticalOffset={10}>
                <View style={flexOneStyle}>
                  <DefaultHeader
                    title="Configuracion del equipo"
                    searchPlaceholder=""
                  />
                  <View style={flexOneStyle}>{renderedStep}</View>
                  <NavigationFooter
                    currentStepId={currentStepId}
                    onNext={handleGoNext}
                    onBack={handleGoBack}
                  />
                </View>
              </KeyboardAvoidingView>
            ) : (
              /* Android: no KeyboardAvoidingView -- the OS handles keyboard
                 avoidance natively via adjustResize. Using KAV on Android
                 causes a ghost gap below the footer after the keyboard closes. */
              <View style={flexOneStyle}>
                <DefaultHeader
                  title="Configuracion del equipo"
                  searchPlaceholder=""
                />
                <View style={flexOneStyle}>{renderedStep}</View>
                <NavigationFooter
                  currentStepId={currentStepId}
                  onNext={handleGoNext}
                  onBack={handleGoBack}
                />
              </View>
            )
          ) : (
            <ScrollView>
              <DefaultHeader
                title="Configuracion del equipo"
                searchPlaceholder=""
              />

              {/* Content */}
              {renderedStep}

              {/* Footer */}
              <NavigationFooter
                currentStepId={currentStepId}
                onNext={handleGoNext}
                onBack={handleGoBack}
              />
            </ScrollView>
          )}
        </FormProvider>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
