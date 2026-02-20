import { View, Text, ScrollView } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { ReviewStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { styles } from './_styles';

export default function ReviewStep({ panel }: ReviewStepProps) {
  const { getValues } = useFormContext<PanelConfigurationFormValues>();
  const values = getValues();

  // Map values to the structure expected by PanelDetailContent
  const mappedDetail = {
    rotulo: values.panelName || panel?.equipment_detail?.rotulo || '',
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
        tipo: (itm.interruptorType === 'id'
          ? 'ID'
          : itm.interruptorType === 'reserva'
            ? 'Reserva'
            : 'ITM') as any,
        amperaje: itm.amperaje || '',
        fases: itm.phase || '',
        tipo_cable: itm.cableType || 'no_libre_halogeno',
        diametro_cable: itm.diameter || '',
        suministra: itm.supply || '',
        diferencial:
          itm.interruptorType === 'itm'
            ? {
                existe: !!itm.hasID,
                amperaje: itm.amperajeID || 0,
                fases: itm.phaseID || '',
                tipo_cable: itm.cableTypeID || '',
                diametro_cable: itm.diameterID || '',
              }
            : undefined,
        sub_itms:
          itm.interruptorType === 'id' && itm.subITMs
            ? itm.subITMs.map((sub, sIdx) => ({
                id: `${itg.cnPrefix}${cIdx + 1}-${sIdx + 1}`,
                amperaje: sub.amperajeITM,
                fases: sub.phaseITM,
                tipo_cable: sub.cableType || 'no_libre_halogeno',
                diametro_cable: sub.diameter,
                suministra: sub.supply || '',
              }))
            : undefined,
      })),
    })),
    componentes: values.enabledComponents.map(type => ({
      tipo: type,
      items: (values.extraComponents[type] || []).map(item => ({
        codigo: item.id,
        suministra: item.description,
      })),
    })),
    condiciones_especiales: values.extraConditions,
  };

  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.equipmentLabel}>
        Equipo {panel?.equipment_detail?.rotulo || panel?.codigo || ''}
      </Text>
      <Text style={styles.stepTitleStrong}>Resumen Final</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginTop: 16 }}>
        <PanelDetailContent data={mappedDetail} />
      </ScrollView>
    </View>
  );
}
