import { View, Text, ScrollView } from 'react-native';
import { useFormContext } from "react-hook-form";
import { ReviewStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { styles } from './_styles';

export default function ReviewStep({
  panel,
}: ReviewStepProps) {
  const { getValues } = useFormContext<PanelConfigurationFormValues>();
  const values = getValues();

  // Map values to the structure expected by PanelDetailContent
  const mappedDetail = {
    rotulo: panel?.rotulo || panel?.name || '',
    tipo_tablero: values.panelType,
    detalle_tecnico: {
      fases: values.phase,
      voltaje: values.voltage,
      tipo_tablero: values.panelType,
    },
    itgs: values.itgCircuits.map((itg, idx) => ({
      id: `IT-G${idx + 1}`,
      suministra: values.itgDescriptions[idx] || '',
      prefijo: itg.cnPrefix,
      itms: itg.circuits.map((itm, cIdx) => ({
        id: `${itg.cnPrefix}${cIdx + 1}`,
        amperaje: itm.amperajeITM,
        fases: itm.phaseITM,
        tipo_cable: itm.cableType || 'no_libre_halogeno',
        diametro_cable: itm.diameter,
        suministra: itm.supply,
        diferencial: {
          existe: itm.hasID,
          amperaje: itm.amperajeID,
          fases: itm.phaseID,
        }
      }))
    })),
    componentes: values.enabledComponents.map(type => ({
      tipo: type,
      items: values.extraComponents[type] || []
    })),
    condiciones_especiales: values.extraConditions
  };

  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.equipmentLabel}>Equipo {panel?.name || panel?.codigo || ''}</Text>
      <Text style={styles.stepTitleStrong}>Resumen Final</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
        <PanelDetailContent
          detail={mappedDetail}
          panelInfo={{
            codigo: panel?.codigo
          }}
        />
      </ScrollView>
    </View>
  );
}
