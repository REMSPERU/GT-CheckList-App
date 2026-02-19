import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRef, useMemo } from 'react';
import { FormProvider } from 'react-hook-form';
import DefaultHeader from '@/components/default-header';
import {
  usePanelConfiguration,
  STEP_IDS,
  isLastStep,
  isFirstStep,
} from '@/hooks/use-electrical-panel-configuration';
import { PanelData, CircuitsConfigStepRef } from '@/types/panel-configuration';
import { styles } from './_config-steps/_styles';
import BasicInfoStep from './_config-steps/BasicInfoStep';
import ITGConfigStep from './_config-steps/ITGConfigStep';
import CircuitsConfigStep from './_config-steps/CircuitsConfigStep';
import ExtraComponentsStep from './_config-steps/ExtraComponentsStep';
import ExtraConditionsStep from './_config-steps/ExtraConditionsStep';
import ReviewStep from './_config-steps/ReviewStep';

export default function PanelConfigurationScreen() {
  const params = useLocalSearchParams();

  // Parse panel data from URL params (derived state, no useEffect needed)
  const panel = useMemo<PanelData | null>(() => {
    if (params.panel) {
      try {
        return JSON.parse(params.panel as string);
      } catch {
        return {
          id: 'N/A',
          codigo: 'N/A',
          equipment_detail: { rotulo: 'Equipo' },
        };
      }
    }
    return null;
  }, [params.panel]);

  // Ref to hold custom navigation handlers from CircuitsConfigStep
  const circuitsNavHandlersRef = useRef<CircuitsConfigStepRef | null>(null);

  const { currentStepId, form, goNext, goBack } = usePanelConfiguration(panel);

  // Custom navigation for Circuits step
  const handleGoNext = async () => {
    // If we are in Circuits step and have custom handlers
    if (currentStepId === STEP_IDS.CIRCUITS && circuitsNavHandlersRef.current) {
      // handleNext returns true if we should proceed to next step
      // returns false if we just switched tabs locally or validation failed
      const canProceed = await circuitsNavHandlersRef.current.handleNext();
      if (canProceed) {
        goNext(); // Actually go to next step
      }
      // Otherwise stay on current IT-G tab
    } else {
      goNext();
    }
  };

  const handleGoBack = () => {
    if (currentStepId === STEP_IDS.CIRCUITS && circuitsNavHandlersRef.current) {
      const canGoBack = circuitsNavHandlersRef.current.handleBack();
      if (canGoBack) {
        goBack(); // Actually go to previous step
      }
      // Otherwise stay on current IT-G tab
    } else {
      goBack();
    }
  };

  const renderStep = () => {
    switch (currentStepId) {
      case STEP_IDS.BASIC_INFO:
        return <BasicInfoStep panel={panel} />;
      case STEP_IDS.ITG_CONFIG:
        return <ITGConfigStep panel={panel} />;
      /* ... */
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <FormProvider {...form}>
        {currentStepId === STEP_IDS.CIRCUITS ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
            <View style={{ flex: 1 }}>
              <DefaultHeader
                title="Configuración del equipo"
                searchPlaceholder=""
              />
              <View style={{ flex: 1 }}>{renderStep()}</View>
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleGoNext}>
                  <Text style={styles.primaryBtnText}>
                    {isLastStep(currentStepId) ? 'Guardar' : 'Siguiente'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleGoBack}>
                  <Text style={styles.secondaryBtnText}>
                    {isFirstStep(currentStepId) ? 'Cancel' : 'Atrás'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <ScrollView>
            <DefaultHeader
              title="Configuración del equipo"
              searchPlaceholder=""
            />

            {/* Content */}
            {renderStep()}

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGoNext}>
                <Text style={styles.primaryBtnText}>
                  {isLastStep(currentStepId) ? 'Guardar' : 'Siguiente'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleGoBack}>
                <Text style={styles.secondaryBtnText}>
                  {isFirstStep(currentStepId) ? 'Cancel' : 'Atrás'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </FormProvider>
    </SafeAreaView>
  );
}
