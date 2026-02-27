import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { memo } from 'react';
import { ReviewStepProps } from '@/types/panel-configuration';
import { PanelConfigurationFormValues } from '@/schemas/panel-configuration';
import { PanelDetailContent } from '@/components/maintenance/PanelDetailContent';
import { styles } from './_styles';

// Static style extracted from inline object
const localStyles = StyleSheet.create({
  scrollView: { marginTop: 16 },
});

function ReviewStep({ panel }: ReviewStepProps) {
  const { getValues } = useFormContext<PanelConfigurationFormValues>();

  // No useMemo here — getValues and panel are both stable references, so
  // a dependency array of [getValues, panel] would NEVER invalidate and
  // the user would see stale data in the review.  Since ReviewStep is
  // already wrapped in memo() it only re-renders when navigating to this
  // step, making a plain function call perfectly cheap.
  const values = getValues();
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
      fases: itg.phaseITG || '',
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
          itm.interruptorType === 'id' ||
          (itm.interruptorType === 'itm' &&
            itm.subITMs &&
            itm.subITMs.length > 0)
            ? itm.subITMs?.map((sub, sIdx) => ({
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
        style={localStyles.scrollView}>
        <PanelDetailContent data={mappedDetail} />
      </ScrollView>
    </View>
  );
}

export default memo(ReviewStep);
