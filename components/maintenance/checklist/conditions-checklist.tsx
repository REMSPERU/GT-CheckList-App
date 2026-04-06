import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { ItemObservation } from '@/types/maintenance-session';
import { Ionicons } from '@expo/vector-icons';

interface ConditionsChecklistProps {
  conditions: Record<string, boolean>;
  checklist: Record<string, boolean>;
  itemObservations: Record<string, ItemObservation>;
  onStatusChange: (itemId: string, status: boolean) => void;
  onObservationChange: (itemId: string, text: string) => void;
  onPhotoPress: (itemId: string) => void;
}

interface ConditionOption {
  label: string;
  reportText: string;
}

export interface ElectricalPanelConditionDefinition {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  normalStatusLabel?: string;
  defaultStatus: boolean;
  reportTextOnObs?: string;
  optionsOnObs?: ConditionOption[];
  allowCommentsOnDefaultStatus?: boolean;
  allowCommentsOnObsStatus?: boolean;
  commentsPlaceholder?: string;
}

export const ELECTRICAL_PANEL_CONDITIONS: ElectricalPanelConditionDefinition[] =
  [
    {
      key: 'mandil_proteccion',
      label: 'Mandil de protección',
      icon: 'shield-checkmark-outline',
      defaultStatus: true,
      reportTextOnObs: 'No cuenta con Mandil',
    },
    {
      key: 'puerta_mandil_aterrados',
      label: 'Puerta / Mandil aterrados',
      icon: 'lock-closed-outline',
      defaultStatus: true,
      reportTextOnObs: 'No cuenta con Mandil',
    },
    {
      key: 'barra_tierra',
      label: 'Barra de tierra',
      icon: 'construct-outline',
      defaultStatus: true,
      optionsOnObs: [
        {
          label: 'Malas condiciones',
          reportText: 'Presenta malas condiciones',
        },
        {
          label: 'Sobrecargada',
          reportText: 'Se encuentra sobrecargada',
        },
        { label: 'Sin barra a tierra', reportText: 'Sin barra a tierra' },
      ],
    },
    {
      key: 'terminal_electrico',
      label: 'Terminales eléctricos',
      icon: 'link-outline',
      defaultStatus: true,
      reportTextOnObs: 'No cuenta con terminales en algunos Circuitos',
    },
    {
      key: 'mangas_termo_contraibles',
      label: 'Mangas Termo contraíbles',
      icon: 'barcode-outline',
      defaultStatus: true,
      reportTextOnObs:
        'No cuenta con mangas termocontraibles en algunos Circuitos',
    },
    {
      key: 'diagrama_unifilar_directorio',
      label: 'Diagrama unifilar y directorio',
      icon: 'document-text-outline',
      defaultStatus: true,
      optionsOnObs: [
        {
          label: 'Sin diagrama/directorio',
          reportText: 'No cuenta con diagrama unifilar o directorio',
        },
        { label: 'No actualizado', reportText: 'No esta actualizado' },
      ],
    },
    {
      key: 'luz_emergencia',
      label: 'Tablero cuenta con luz de emergencia',
      icon: 'flash-outline',
      defaultStatus: true,
      reportTextOnObs: 'No cuenta',
    },
    {
      key: 'senaletica_riesgo_electrico',
      label: 'Señalética de riesgo eléctrico es adecuada',
      icon: 'warning-outline',
      defaultStatus: true,
      reportTextOnObs: 'No es la correcta',
    },
    {
      key: 'cerradura_tablero',
      label: 'Cerradura del Tablero',
      icon: 'key-outline',
      defaultStatus: true,
      reportTextOnObs: 'Defectuoso',
      normalStatusLabel: 'OK',
    },
    {
      key: 'tablero_presenta_oxidacion',
      label: 'Tablero presenta Oxidación',
      icon: 'water-outline',
      defaultStatus: true,
      normalStatusLabel: 'NO',
      reportTextOnObs: 'Requiere mantenimiento',
    },
    {
      key: 'detalles_adicionales',
      label: 'Detalles adicionales',
      icon: 'create-outline',
      defaultStatus: true,
      normalStatusLabel: 'NO',
      allowCommentsOnObsStatus: true,
      commentsPlaceholder: 'AGREGA COMENTARIOS',
    },
  ];

export function shouldRenderElectricalPanelCondition(
  key: string,
  conditions: Record<string, boolean>,
) {
  if (key in conditions) {
    return conditions[key] === true;
  }

  return true;
}

export const ConditionsChecklist = React.memo(function ConditionsChecklist({
  conditions,
  checklist,
  itemObservations,
  onStatusChange,
  onObservationChange,
  onPhotoPress,
}: ConditionsChecklistProps) {
  const visibleConditions = useMemo(
    () =>
      ELECTRICAL_PANEL_CONDITIONS.filter(def =>
        shouldRenderElectricalPanelCondition(def.key, conditions),
      ),
    [conditions],
  );

  const getAutoObservation = useCallback(
    (definition: ElectricalPanelConditionDefinition) => {
      if (definition.optionsOnObs && definition.optionsOnObs.length > 0) {
        return definition.optionsOnObs[0].reportText;
      }

      return definition.reportTextOnObs || '';
    },
    [],
  );

  const renderedConditions = useMemo(
    () =>
      visibleConditions.map(definition => {
        const itemId = `cond_${definition.key}`;
        const currentStatus = checklist[itemId];
        const status =
          currentStatus === undefined
            ? definition.defaultStatus
            : currentStatus === true;
        const observation = itemObservations[itemId];

        const obsText = observation?.note || '';
        const hasOptions = !!definition.optionsOnObs?.length;
        const selectedOption = definition.optionsOnObs?.find(
          option => option.reportText === obsText,
        );
        const autoObsText =
          selectedOption?.reportText ||
          obsText ||
          getAutoObservation(definition);

        const shouldShowObsSection = !status;
        const shouldShowOptionList = shouldShowObsSection && hasOptions;
        const shouldShowFixedObsText =
          shouldShowObsSection && !definition.allowCommentsOnObsStatus;
        const shouldShowCommentsOnDefault =
          status && !!definition.allowCommentsOnDefaultStatus;
        const shouldShowCommentsOnObs =
          !status && !!definition.allowCommentsOnObsStatus;
        const shouldShowCommentInput =
          shouldShowCommentsOnDefault || shouldShowCommentsOnObs;
        const shouldShowPhotoButton =
          shouldShowObsSection || shouldShowCommentInput;

        const activeStatusLabel = status
          ? definition.normalStatusLabel || 'OK'
          : 'OBS';

        const handleStatusToggle = (nextStatus: boolean) => {
          onStatusChange(itemId, nextStatus);

          if (
            definition.allowCommentsOnDefaultStatus ||
            definition.allowCommentsOnObsStatus
          ) {
            const isAllowedForNextStatus = nextStatus
              ? definition.allowCommentsOnDefaultStatus
              : definition.allowCommentsOnObsStatus;

            if (!isAllowedForNextStatus) {
              onObservationChange(itemId, '');
            }

            return;
          }

          if (nextStatus) {
            onObservationChange(itemId, '');
            return;
          }

          onObservationChange(itemId, getAutoObservation(definition));
        };

        return (
          <View key={itemId} style={styles.card}>
            <View style={styles.header}>
              <View style={styles.labelContainer}>
                <Ionicons
                  name={definition.icon}
                  size={20}
                  color="#0891B2"
                  style={styles.labelIcon}
                />
                <Text style={styles.label}>{definition.label}</Text>
              </View>

              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, status && styles.statusOk]}>
                  {activeStatusLabel}
                </Text>
                <Switch
                  value={status}
                  onValueChange={handleStatusToggle}
                  trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {shouldShowOptionList && (
              <View style={styles.optionsWrap}>
                {(definition.optionsOnObs || []).map(option => {
                  const isSelected = option.reportText === autoObsText;
                  return (
                    <Pressable
                      key={option.reportText}
                      style={({ pressed }) => [
                        styles.optionChip,
                        isSelected && styles.optionChipSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() =>
                        onObservationChange(itemId, option.reportText)
                      }
                      accessibilityRole="button">
                      <Text
                        style={[
                          styles.optionChipText,
                          isSelected && styles.optionChipTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {shouldShowFixedObsText && (
              <View style={styles.reportTextBox}>
                <Text style={styles.reportTextLabel}>Texto del informe:</Text>
                <Text style={styles.reportText}>{autoObsText}</Text>
              </View>
            )}

            {shouldShowCommentInput && (
              <TextInput
                style={styles.commentInput}
                placeholder={
                  definition.commentsPlaceholder || 'AGREGA COMENTARIOS'
                }
                value={obsText}
                onChangeText={text => onObservationChange(itemId, text)}
                multiline
              />
            )}

            {shouldShowPhotoButton && (
              <View style={styles.photoRow}>
                {observation?.photoUri && (
                  <Image
                    source={{ uri: observation.photoUri }}
                    style={styles.photoPreview}
                    contentFit="cover"
                    transition={100}
                  />
                )}
                <Pressable
                  onPress={() => onPhotoPress(itemId)}
                  style={({ pressed }) => [
                    styles.cameraBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button">
                  <Ionicons name="camera-outline" size={20} color="#6B7280" />
                </Pressable>
              </View>
            )}
          </View>
        );
      }),
    [
      checklist,
      getAutoObservation,
      itemObservations,
      onObservationChange,
      onPhotoPress,
      onStatusChange,
      visibleConditions,
    ],
  );

  if (!visibleConditions.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Condiciones extras</Text>

      {renderedConditions}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11181C',
    marginBottom: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  labelIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusOk: {
    color: '#0891B2',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  optionChipSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#ECFEFF',
  },
  optionChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: '#0E7490',
  },
  reportTextBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reportTextLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  reportText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  commentInput: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  photoRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  photoPreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  cameraBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.82,
  },
});
