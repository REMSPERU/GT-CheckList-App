import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ProgressTabsProps {
  items: string[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  disabled?: boolean; // Disable tab clicking
}

const TAB_HEIGHT = 44;
const ARROW_SIZE = TAB_HEIGHT / Math.sqrt(2) - 1;
const OVERLAP = 18;

// Memoized individual tab component
const TabItem = React.memo(
  ({
    label,
    index,
    isSelected,
    isFirst,
    isLast,
    totalItems,
    onPress,
    disabled,
  }: {
    label: string;
    index: number;
    isSelected: boolean;
    isFirst: boolean;
    isLast: boolean;
    totalItems: number;
    onPress: () => void;
    disabled?: boolean;
  }) => {
    // Memoize styles to prevent recreation on every render
    const bgStyle = useMemo(
      () => ({
        backgroundColor: isSelected ? '#0891B2' : '#FFFFFF',
      }),
      [isSelected],
    );

    const textStyle = useMemo(
      () => ({
        color: isSelected ? '#FFFFFF' : '#6B7280',
        fontWeight: (isSelected ? '700' : '500') as '500' | '700',
      }),
      [isSelected],
    );

    const borderColor = useMemo(
      () => ({
        borderColor: '#D1D5DB',
      }),
      [],
    );

    const containerStyle = useMemo(
      () => [
        styles.tabContainer,
        {
          zIndex: totalItems - index,
          marginLeft: isFirst ? 0 : -OVERLAP,
        },
      ],
      [index, isFirst, totalItems],
    );

    const bodyStyle = useMemo(
      () => [
        styles.tabBody,
        bgStyle,
        borderColor,
        isFirst && styles.firstTab,
        isLast && styles.lastTab,
      ],
      [bgStyle, borderColor, isFirst, isLast],
    );

    const textPaddingStyle = useMemo(
      () => [
        styles.tabText,
        textStyle,
        !isFirst && { paddingLeft: 14 },
        !isLast && { paddingRight: 6 },
      ],
      [textStyle, isFirst, isLast],
    );

    const arrowStyle = useMemo(
      () => [styles.arrow, bgStyle, borderColor],
      [bgStyle, borderColor],
    );

    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.8}
        disabled={disabled}>
        <View style={bodyStyle}>
          <Text style={textPaddingStyle} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {!isLast && <View style={arrowStyle} />}
      </TouchableOpacity>
    );
  },
);

TabItem.displayName = 'TabItem';

function ProgressTabs({
  items,
  selectedIndex,
  onSelectIndex,
  disabled = false,
}: ProgressTabsProps) {
  // Memoize handler creator to prevent recreation
  const handlePress = useCallback(
    (index: number) => {
      return () => onSelectIndex(index);
    },
    [onSelectIndex],
  );

  return (
    <View style={styles.container}>
      {items.map((label, index) => (
        <TabItem
          key={`tab-${index}`}
          label={label}
          index={index}
          isSelected={selectedIndex === index}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          totalItems={items.length}
          onPress={handlePress(index)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

// Memoize the entire component
export default React.memo(ProgressTabs, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these change
  return (
    prevProps.selectedIndex === nextProps.selectedIndex &&
    prevProps.items.length === nextProps.items.length &&
    prevProps.items.every((item, idx) => item === nextProps.items[idx])
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    height: TAB_HEIGHT,
    paddingHorizontal: 4,
  },
  tabContainer: {
    flex: 1,
    height: TAB_HEIGHT,
    position: 'relative',
  },
  tabBody: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstTab: {
    borderLeftWidth: 1,
    borderTopLeftRadius: TAB_HEIGHT / 2,
    borderBottomLeftRadius: TAB_HEIGHT / 2,
    marginLeft: 0,
  },
  lastTab: {
    borderRightWidth: 1,
    borderTopRightRadius: TAB_HEIGHT / 2,
    borderBottomRightRadius: TAB_HEIGHT / 2,
  },
  tabText: {
    fontSize: 14,
  },
  arrow: {
    position: 'absolute',
    right: -(ARROW_SIZE / 2) + 0.5,
    top: (TAB_HEIGHT - ARROW_SIZE) / 2 - 1,
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderTopWidth: 1,
    borderRightWidth: 1,
    transform: [{ rotate: '45deg' }],
    zIndex: 10,
  },
});
