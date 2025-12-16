import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import DefaultHeader from '@/components/default-header';
import { usePanelConfiguration } from './_panel-configuration/_usePanelConfiguration';
import { PanelData } from './_panel-configuration/_types';
import { styles } from './_panel-configuration/_styles';
import { STEP_IDS, isLastStep, isFirstStep } from './_panel-configuration/_stepConfig';
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
        setPanel({ name: 'Equipo', id: 'N/A' });
      }
    }
  }, [params.panel]);

  const {
    currentStepId,
    panelType,
    setPanelType,
    voltage,
    setVoltage,
    phase,
    setPhase,
    itgCount,
    setItgCount,
    itgDescriptions,
    setItgDescriptions,
    itgCircuits,
    setItgCircuits,
    enabledComponents,
    setEnabledComponents,
    extraComponents,
    setExtraComponents,
    extraConditions,
    setExtraConditions,
    goNext,
    goBack,
  } = usePanelConfiguration(panel);

  // Custom navigation for Circuits step
  const handleGoNext = () => {
    if (currentStepId === STEP_IDS.CIRCUITS && circuitsNavHandlersRef.current) {
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
        return (
          <BasicInfoStep
            panel={panel}
            panelType={panelType}
            setPanelType={setPanelType}
            voltage={voltage}
            setVoltage={setVoltage}
            phase={phase}
            setPhase={setPhase}
          />
        );
      case STEP_IDS.ITG_CONFIG:
        return (
          <ITGConfigStep
            panel={panel}
            itgCount={itgCount}
            setItgCount={setItgCount}
            itgDescriptions={itgDescriptions}
            setItgDescriptions={setItgDescriptions}
          />
        );
      case STEP_IDS.CIRCUITS:
        return (
          <CircuitsConfigStep
            panel={panel}
            itgDescriptions={itgDescriptions}
            itgCircuits={itgCircuits}
            setItgCircuits={setItgCircuits}
            navigationHandlers={circuitsNavHandlersRef}
          />
        );
      case STEP_IDS.EXTRA_COMPONENTS:
        return (
          <ExtraComponentsStep
            panel={panel}
            enabledComponents={enabledComponents}
            setEnabledComponents={setEnabledComponents}
            extraComponents={extraComponents}
            setExtraComponents={setExtraComponents}
          />
        );
      case STEP_IDS.EXTRA_CONDITIONS:
        return (
          <ExtraConditionsStep
            panel={panel}
            extraConditions={extraConditions}
            setExtraConditions={setExtraConditions}
          />
        );
      case STEP_IDS.REVIEW:
        return (
          <ReviewStep
            panel={panel}
            panelType={panelType}
            voltage={voltage}
            phase={phase}
            itgDescriptions={itgDescriptions}
            itgCircuits={itgCircuits}
            enabledComponents={enabledComponents}
            extraComponents={extraComponents}
            extraConditions={extraConditions}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <DefaultHeader title="Configuración del equipo" searchPlaceholder="" />

        {/* Content */}
        {renderStep()}

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGoNext}>
            <Text style={styles.primaryBtnText}>{isLastStep(currentStepId) ? 'Guardar' : 'Siguiente'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleGoBack}>
            <Text style={styles.secondaryBtnText}>{isFirstStep(currentStepId) ? 'Cancel' : 'Atrás'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
