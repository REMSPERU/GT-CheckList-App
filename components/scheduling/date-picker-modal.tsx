import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  selectedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
}

function normalizeDate(value: Date) {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function DatePickerModal({
  visible,
  title,
  selectedDate,
  minDate,
  maxDate,
  onCancel,
  onConfirm,
}: DatePickerModalProps) {
  const safeSelectedDate = useMemo(() => {
    return Number.isNaN(selectedDate.getTime()) ? new Date() : selectedDate;
  }, [selectedDate]);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialMonth = new Date(safeSelectedDate);
    initialMonth.setDate(1);
    return initialMonth;
  });

  useEffect(() => {
    if (!visible) return;
    const selectedMonth = new Date(safeSelectedDate);
    selectedMonth.setDate(1);
    setCalendarMonth(selectedMonth);
  }, [safeSelectedDate, visible]);

  const minSelectableDate = useMemo(
    () => (minDate ? normalizeDate(minDate) : null),
    [minDate],
  );
  const maxSelectableDate = useMemo(
    () => (maxDate ? normalizeDate(maxDate) : null),
    [maxDate],
  );

  const minMonth = useMemo(() => {
    if (!minSelectableDate) return null;
    const month = new Date(minSelectableDate);
    month.setDate(1);
    return month;
  }, [minSelectableDate]);

  const maxMonth = useMemo(() => {
    if (!maxSelectableDate) return null;
    const month = new Date(maxSelectableDate);
    month.setDate(1);
    return month;
  }, [maxSelectableDate]);

  const currentMonth = calendarMonth.getMonth();
  const currentYear = calendarMonth.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekDay =
    (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const monthLabel = calendarMonth.toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
  });

  const canGoPrevMonth =
    !minMonth ||
    currentYear > minMonth.getFullYear() ||
    (currentYear === minMonth.getFullYear() &&
      currentMonth > minMonth.getMonth());

  const canGoNextMonth =
    !maxMonth ||
    currentYear < maxMonth.getFullYear() ||
    (currentYear === maxMonth.getFullYear() &&
      currentMonth < maxMonth.getMonth());

  const changeCalendarMonth = (direction: 'prev' | 'next') => {
    const nextMonth = new Date(calendarMonth);
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + (direction === 'prev' ? -1 : 1));
    setCalendarMonth(nextMonth);
  };

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          <View style={styles.calendarHeader}>
            <Pressable
              style={[
                styles.calendarNavButton,
                !canGoPrevMonth && styles.calendarNavButtonDisabled,
              ]}
              disabled={!canGoPrevMonth}
              onPress={() => changeCalendarMonth('prev')}>
              <Text style={styles.navButtonText}>{'<'}</Text>
            </Pressable>

            <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>

            <Pressable
              style={[
                styles.calendarNavButton,
                !canGoNextMonth && styles.calendarNavButtonDisabled,
              ]}
              disabled={!canGoNextMonth}
              onPress={() => changeCalendarMonth('next')}>
              <Text style={styles.navButtonText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.weekDaysRow}>
            {weekDays.map((day, index) => (
              <Text key={`weekday-${index}`} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {Array.from({ length: firstWeekDay }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.calendarCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const dayNumber = index + 1;
              const dayDate = new Date(currentYear, currentMonth, dayNumber);
              const normalizedDay = normalizeDate(dayDate);

              const isBelowMin =
                minSelectableDate !== null && normalizedDay < minSelectableDate;
              const isAboveMax =
                maxSelectableDate !== null && normalizedDay > maxSelectableDate;
              const isDisabled = isBelowMin || isAboveMax;

              const isSelected =
                normalizedDay.getTime() ===
                normalizeDate(safeSelectedDate).getTime();

              return (
                <View key={`day-${dayNumber}`} style={styles.calendarCell}>
                  <Pressable
                    style={[
                      styles.calendarDayButton,
                      isSelected && styles.calendarDayButtonSelected,
                      isDisabled && styles.calendarDayButtonDisabled,
                    ]}
                    disabled={isDisabled}
                    onPress={() => onConfirm(dayDate)}>
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isDisabled && styles.calendarDayTextDisabled,
                      ]}>
                      {dayNumber}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable style={styles.modalCloseButton} onPress={onCancel}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </Pressable>
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
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayText: {
    width: '14.2857%',
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.2857%',
    paddingVertical: 3,
    alignItems: 'center',
  },
  calendarDayButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayButtonSelected: {
    backgroundColor: '#0891B2',
  },
  calendarDayButtonDisabled: {
    opacity: 0.35,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextDisabled: {
    color: '#9CA3AF',
  },
  modalCloseButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCloseText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
});
