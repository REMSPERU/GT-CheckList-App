import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const TIME_WHEEL_ITEM_HEIGHT = 44;
const TIME_WHEEL_SIDE_SPACER = TIME_WHEEL_ITEM_HEIGHT;

interface TimeWheelPickerModalProps {
  visible: boolean;
  title: string;
  value: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

function formatTwoDigits(value: number) {
  return String(value).padStart(2, '0');
}

function parseTime(value: string) {
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const hour = Number.isFinite(rawHour)
    ? Math.min(Math.max(rawHour, 0), 23)
    : 8;
  const minute = Number.isFinite(rawMinute)
    ? Math.min(Math.max(rawMinute, 0), 59)
    : 0;

  return { hour, minute };
}

function buildTimeValue(hour: number, minute: number) {
  return `${formatTwoDigits(hour)}:${formatTwoDigits(minute)}`;
}

function getWheelIndex(offset: number, maxIndex: number) {
  const roundedIndex = Math.round(offset / TIME_WHEEL_ITEM_HEIGHT);
  return Math.min(Math.max(roundedIndex, 0), maxIndex);
}

function getNearestMinuteStepIndex(minute: number) {
  const nearestMinute = Math.round(minute / 5) * 5;
  const clampedMinute = Math.min(Math.max(nearestMinute, 0), 55);
  return clampedMinute / 5;
}

export function TimeWheelPickerModal({
  visible,
  title,
  value,
  onCancel,
  onConfirm,
}: TimeWheelPickerModalProps) {
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minuteSteps = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i * 5),
    [],
  );

  const [draftTime, setDraftTime] = useState(value);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;

    setDraftTime(value);
    const parsed = parseTime(value);

    requestAnimationFrame(() => {
      hourScrollRef.current?.scrollTo({
        y: parsed.hour * TIME_WHEEL_ITEM_HEIGHT,
        animated: false,
      });
      minuteScrollRef.current?.scrollTo({
        y: getNearestMinuteStepIndex(parsed.minute) * TIME_WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    });
  }, [value, visible]);

  const { hour: selectedHour, minute: selectedMinute } = parseTime(draftTime);
  const selectedMinuteStep =
    minuteSteps[getNearestMinuteStepIndex(selectedMinute)] ?? 0;

  const handleHourScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const hourIndex = getWheelIndex(event.nativeEvent.contentOffset.y, 23);
      const hourValue = hours[hourIndex] ?? 0;

      setDraftTime(prev => {
        const { minute } = parseTime(prev);
        return buildTimeValue(hourValue, minute);
      });
    },
    [hours],
  );

  const handleMinuteScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const minuteIndex = getWheelIndex(event.nativeEvent.contentOffset.y, 11);
      const minuteValue = minuteSteps[minuteIndex] ?? 0;

      setDraftTime(prev => {
        const { hour } = parseTime(prev);
        return buildTimeValue(hour, minuteValue);
      });
    },
    [minuteSteps],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.timeHintText}>
            Desliza para ajustar hora y minutos
          </Text>

          <View style={styles.timeWheelsRow}>
            <View style={styles.timeWheelColumn}>
              <Text style={styles.timeWheelLabel}>Hora</Text>
              <View style={styles.timeWheelWrapper}>
                <ScrollView
                  ref={hourScrollRef}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeWheelContent}
                  snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
                  snapToAlignment="start"
                  decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={handleHourScrollEnd}>
                  <View style={styles.timeWheelSpacer} />
                  {hours.map(hour => (
                    <View key={`hour-${hour}`} style={styles.timeWheelItem}>
                      <Text
                        style={[
                          styles.timeWheelItemText,
                          selectedHour === hour &&
                            styles.timeWheelItemTextActive,
                        ]}>
                        {formatTwoDigits(hour)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.timeWheelSpacer} />
                </ScrollView>
                <View pointerEvents="none" style={styles.timeWheelCenterLine} />
              </View>
            </View>

            <Text style={styles.timeWheelSeparator}>:</Text>

            <View style={styles.timeWheelColumn}>
              <Text style={styles.timeWheelLabel}>Minuto</Text>
              <View style={styles.timeWheelWrapper}>
                <ScrollView
                  ref={minuteScrollRef}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeWheelContent}
                  snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
                  snapToAlignment="start"
                  decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={handleMinuteScrollEnd}>
                  <View style={styles.timeWheelSpacer} />
                  {minuteSteps.map(minute => (
                    <View key={`minute-${minute}`} style={styles.timeWheelItem}>
                      <Text
                        style={[
                          styles.timeWheelItemText,
                          selectedMinuteStep === minute &&
                            styles.timeWheelItemTextActive,
                        ]}>
                        {formatTwoDigits(minute)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.timeWheelSpacer} />
                </ScrollView>
                <View pointerEvents="none" style={styles.timeWheelCenterLine} />
              </View>
            </View>
          </View>

          <Text style={styles.timeSelectedText}>{draftTime}</Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={() => onConfirm(draftTime)}>
              <Text style={styles.confirmButtonText}>Listo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  timeHintText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 12,
  },
  timeWheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timeWheelColumn: {
    width: 110,
  },
  timeWheelLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 8,
  },
  timeWheelWrapper: {
    height: TIME_WHEEL_ITEM_HEIGHT * 3,
    position: 'relative',
  },
  timeWheelContent: {
    paddingVertical: 0,
  },
  timeWheelSpacer: {
    height: TIME_WHEEL_SIDE_SPACER,
  },
  timeWheelItem: {
    height: TIME_WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeWheelItemText: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timeWheelItemTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  timeWheelCenterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TIME_WHEEL_SIDE_SPACER,
    height: TIME_WHEEL_ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D1D5DB',
  },
  timeWheelSeparator: {
    fontSize: 28,
    color: '#1F2937',
    fontWeight: '700',
    marginHorizontal: 6,
    marginTop: 18,
  },
  timeSelectedText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 10,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 42,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891B2',
    borderRadius: 10,
    height: 42,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
