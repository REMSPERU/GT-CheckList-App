import React, { memo, useCallback, useState } from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuestionChecklistItemValue {
  status: boolean | null;
  isApplicable?: boolean;
  observation: string;
  photoUris: string[];
}

interface QuestionChecklistItemErrors {
  observation?: string;
  photos?: string;
}

interface QuestionChecklistItemProps {
  order: number;
  question: string;
  value: QuestionChecklistItemValue;
  onChangeStatus: (status: boolean) => void;
  onChangeApplicable?: (isApplicable: boolean) => void;
  onChangeObservation: (text: string) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  errors?: QuestionChecklistItemErrors;
  disabled?: boolean;
  showApplicabilityToggle?: boolean;
  questionMaxLines?: number;
  allowQuestionExpand?: boolean;
  statusLayout?: 'inline' | 'stacked';
}

export const QuestionChecklistItem = memo(function QuestionChecklistItem({
  order,
  question,
  value,
  onChangeStatus,
  onChangeApplicable,
  onChangeObservation,
  onAddPhoto,
  onRemovePhoto,
  errors,
  disabled = false,
  showApplicabilityToggle = false,
  questionMaxLines,
  allowQuestionExpand = false,
  statusLayout = 'inline',
}: QuestionChecklistItemProps) {
  const [isQuestionExpanded, setIsQuestionExpanded] = useState(false);
  const isApplicable = value.isApplicable !== false;
  const showObservationBlock = isApplicable && value.status === false;
  const statusLabel =
    value.status === null ? 'Sin respuesta' : value.status ? 'OK' : 'OBS';
  const handleAddPhotoPress = useCallback(() => {
    if (!disabled) {
      onAddPhoto();
    }
  }, [disabled, onAddPhoto]);

  const handleApplicableToggle = useCallback(
    (nextValue: boolean) => {
      if (!disabled) {
        onChangeApplicable?.(nextValue);
      }
    },
    [disabled, onChangeApplicable],
  );

  const isStackedLayout = showApplicabilityToggle && statusLayout === 'stacked';

  const statusButtons = (
    <View
      style={[
        styles.statusButtonsRow,
        isStackedLayout && styles.statusButtonsRowStacked,
      ]}>
      <Pressable
        onPress={() => onChangeStatus(true)}
        style={({ pressed }) => [
          styles.statusButton,
          isStackedLayout && styles.statusButtonStacked,
          value.status === true && styles.statusButtonActiveOk,
          pressed && styles.pressed,
        ]}
        disabled={disabled}
        accessibilityRole="button">
        <Text
          style={[
            styles.statusButtonText,
            value.status === true && styles.statusButtonTextActive,
          ]}>
          OK
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChangeStatus(false)}
        style={({ pressed }) => [
          styles.statusButton,
          isStackedLayout && styles.statusButtonStacked,
          value.status === false && styles.statusButtonActiveObs,
          pressed && styles.pressed,
        ]}
        disabled={disabled}
        accessibilityRole="button">
        <Text
          style={[
            styles.statusButtonText,
            value.status === false && styles.statusButtonTextActive,
          ]}>
          OBS
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.card}>
      <View
        style={[styles.headerRow, isStackedLayout && styles.headerRowStacked]}>
        <View style={styles.questionWrap}>
          <View style={styles.orderBadge}>
            <Text style={styles.orderText}>{order}</Text>
          </View>
          <View style={styles.questionTextWrap}>
            <Text
              style={styles.questionText}
              numberOfLines={
                isQuestionExpanded
                  ? undefined
                  : questionMaxLines && questionMaxLines > 0
                    ? questionMaxLines
                    : undefined
              }>
              {question}
            </Text>
            {allowQuestionExpand && questionMaxLines ? (
              <Pressable
                onPress={() => setIsQuestionExpanded(prev => !prev)}
                style={({ pressed }) => [
                  styles.expandQuestionBtn,
                  pressed && styles.pressed,
                ]}
                disabled={disabled}
                accessibilityRole="button">
                <Text style={styles.expandQuestionText}>
                  {isQuestionExpanded ? 'Ver menos' : 'Ver mas'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {showApplicabilityToggle ? (
          <View
            style={[
              styles.applyWrap,
              isStackedLayout && styles.applyWrapStacked,
            ]}>
            <View style={styles.applyRow}>
              <Text style={styles.applyText}>Aplica</Text>
              <Switch
                value={isApplicable}
                onValueChange={handleApplicableToggle}
                disabled={disabled}
                trackColor={{ false: '#E5E7EB', true: '#0EA5E9' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isApplicable ? (
              statusButtons
            ) : (
              <Text style={styles.notApplicableText}>No aplica</Text>
            )}
          </View>
        ) : (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>{statusLabel}</Text>
            <Switch
              value={value.status === true}
              onValueChange={onChangeStatus}
              disabled={disabled}
              trackColor={{ false: '#E5E7EB', true: '#0EA5E9' }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}
      </View>

      {showObservationBlock && (
        <View style={styles.detailsWrap}>
          <TextInput
            style={[
              styles.observationInput,
              errors?.observation ? styles.inputError : null,
            ]}
            placeholder="Escriba la observación"
            placeholderTextColor="#9CA3AF"
            value={value.observation}
            onChangeText={onChangeObservation}
            multiline
            editable={!disabled}
            textAlignVertical="top"
          />
          {errors?.observation ? (
            <Text style={styles.errorText}>{errors.observation}</Text>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosRow}>
            {value.photoUris.map((uri, index) => (
              <View key={uri} style={styles.photoWrap}>
                <Image
                  source={{ uri }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={100}
                />
                <Pressable
                  onPress={() => onRemovePhoto(index)}
                  style={({ pressed }) => [
                    styles.removePhotoBtn,
                    pressed && styles.pressed,
                  ]}
                  disabled={disabled}
                  accessibilityRole="button">
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={handleAddPhotoPress}
              style={({ pressed }) => [
                styles.addPhotoBtn,
                pressed && styles.pressed,
              ]}
              disabled={disabled}
              accessibilityRole="button">
              <Ionicons name="camera-outline" size={22} color="#475569" />
              <Text style={styles.addPhotoText}>Agregar foto</Text>
            </Pressable>
          </ScrollView>

          {errors?.photos ? (
            <Text style={styles.errorText}>{errors.photos}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerRowStacked: {
    flexDirection: 'column',
    gap: 10,
  },
  questionWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  questionText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    lineHeight: 20,
  },
  questionTextWrap: {
    flex: 1,
    gap: 4,
  },
  expandQuestionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  expandQuestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  statusWrap: {
    alignItems: 'center',
    gap: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  applyWrap: {
    minWidth: 150,
    alignItems: 'flex-end',
    gap: 8,
  },
  applyWrapStacked: {
    width: '100%',
    minWidth: 0,
    alignItems: 'stretch',
  },
  applyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  applyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButtonsRowStacked: {
    width: '100%',
  },
  statusButton: {
    minWidth: 62,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  statusButtonStacked: {
    flex: 1,
  },
  statusButtonActiveOk: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  statusButtonActiveObs: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  statusButtonTextActive: {
    color: '#0F172A',
  },
  notApplicableText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  detailsWrap: {
    marginTop: 12,
    gap: 8,
  },
  observationInput: {
    minHeight: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: -2,
  },
  photosRow: {
    alignItems: 'center',
    gap: 10,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  addPhotoBtn: {
    width: 92,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});

export type { QuestionChecklistItemValue, QuestionChecklistItemErrors };
