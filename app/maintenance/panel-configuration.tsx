import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { FormProvider } from 'react-hook-form';
import DefaultHeader from '@/components/default-header';
import {
  usePanelConfiguration,
  STEP_IDS,
  isLastStep,
  isFirstStep,
} from '@/hooks/use-electrical-panel-configuration';
import { PanelData } from '@/types/panel-configuration';
import { styles } from './_panel-configuration/_styles';
import BasicInfoStep from './_panel-configuration/BasicInfoStep';
import ITGConfigStep from './_panel-configuration/ITGConfigStep';
import CircuitsConfigStep from './_panel-configuration/CircuitsConfigStep';
import ExtraComponentsStep from './_panel-configuration/ExtraComponentsStep';
import ExtraConditionsStep from './_panel-configuration/ExtraConditionsStep';
import ReviewStep from './_panel-configuration/ReviewStep';

export default function PanelConfigurationScreen() {
  const params = useLocalSearchParams();
  const [panel, setPanel] = useState<PanelData | null>(null);

  // Ref to hold custom navigation handlers from CircuitsConfigStep
  const circuitsNavHandlersRef = useRef<{
    handleNext: () => boolean;
    handleBack: () => boolean;
  } | null>(null);

  useEffect(() => {
    if (params.panel) {
      try {
        setPanel(JSON.parse(params.panel as string));
      } catch {
        setPanel({ name: 'Equipo', id: 'N/A', codigo: 'N/A' });
      }
    }
  }, [params.panel]);

  const { currentStepId, form, goNext, goBack } = usePanelConfiguration(panel);

  // Custom navigation for Circuits step
  const handleGoNext = () => {
    // If we are in Circuits step and have custom handlers
    if (currentStepId === STEP_IDS.CIRCUITS && circuitsNavHandlersRef.current) {
      // handleNext returns true if we should proceed to next step
      // returns false if we just switched tabs locally
      const canProceed = circuitsNavHandlersRef.current.handleNext();
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
          <CircuitsConfigStep
            panel={panel}
            navigationHandlers={circuitsNavHandlersRef}
          />
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
        <ScrollView>
          <DefaultHeader
            title="Configuración del equipo"
            searchPlaceholder=""
          />

          {/* Content */}
          {renderStep()}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGoNext}>
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
      </FormProvider>
    </SafeAreaView>
  );
}
