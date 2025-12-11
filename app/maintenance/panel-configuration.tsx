import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { useEffect, useState } from 'react';
import DefaultHeader from '@/components/default-header';
import { usePanelConfiguration } from './_panel-configuration/_usePanelConfiguration';
import { PanelData } from './_panel-configuration/_types';
import { styles } from './_panel-configuration/_styles';
import StepOne from './_panel-configuration/StepOne';
import StepTwo from './_panel-configuration/StepTwo';
import StepThree from './_panel-configuration/StepThree';
import StepFour from './_panel-configuration/StepFour';
import StepFive from './_panel-configuration/StepFive';

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
    step,
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
    goNext,
    goBack,
  } = usePanelConfiguration(panel);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepOne
            panel={panel}
            panelType={panelType}
            setPanelType={setPanelType}
            voltage={voltage}
            setVoltage={setVoltage}
            phase={phase}
            setPhase={setPhase}
          />
        );
      case 2:
        return (
          <StepTwo
            panel={panel}
            itgCount={itgCount}
            setItgCount={setItgCount}
            itgDescriptions={itgDescriptions}
            setItgDescriptions={setItgDescriptions}
          />
        );
      case 3:
        return (
          <StepThree
            panel={panel}
            cnPrefix={cnPrefix}
            setCnPrefix={setCnPrefix}
            circuitsCount={circuitsCount}
            setCircuitsCount={setCircuitsCount}
            circuits={circuits}
            setCircuits={setCircuits}
          />
        );
      case 4:
        return (
          <StepFour
            panel={panel}
            enabledComponents={enabledComponents}
            setEnabledComponents={setEnabledComponents}
            extraComponents={extraComponents}
            setExtraComponents={setExtraComponents}
          />
        );
      case 5:
        return (
          <StepFive
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
            <Text style={styles.primaryBtnText}>{step === 5 ? 'Guardar' : 'Siguiente'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goBack}>
            <Text style={styles.secondaryBtnText}>{step === 1 ? 'Cancel' : 'Atrás'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}