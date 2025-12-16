import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { useEffect, useState } from 'react';
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
    cnPrefix,
    setCnPrefix,
    circuitsCount,
    setCircuitsCount,
    circuits,
    setCircuits,
    enabledComponents,
    setEnabledComponents,
    extraComponents,
    setExtraComponents,
    extraConditions,
    setExtraConditions,
    goNext,
    goBack,
  } = usePanelConfiguration(panel);

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
            cnPrefix={cnPrefix}
            setCnPrefix={setCnPrefix}
            circuitsCount={circuitsCount}
            setCircuitsCount={setCircuitsCount}
            circuits={circuits}
            setCircuits={setCircuits}
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
            cnPrefix={cnPrefix}
            circuits={circuits}
            enabledComponents={enabledComponents}
            extraComponents={extraComponents}
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
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>{isLastStep(currentStepId) ? 'Guardar' : 'Siguiente'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goBack}>
            <Text style={styles.secondaryBtnText}>{isFirstStep(currentStepId) ? 'Cancel' : 'Atrás'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
