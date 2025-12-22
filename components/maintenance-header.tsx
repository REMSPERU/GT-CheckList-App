import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

interface MaintenanceHeaderProps {
  title: string;
  iconName?: any;
  iconFamily?: 'MaterialIcons' | 'Ionicons';
  assetSource?: ImageSourcePropType;
  backgroundColor?: string;
  onBack?: () => void;
}

export default function MaintenanceHeader({
  title,
  iconName,
  iconFamily = 'MaterialIcons',
  assetSource,
  backgroundColor = '#06B6D4',
  onBack,
}: MaintenanceHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const renderIcon = () => {
    if (assetSource) {
      return (
        <Image
          source={assetSource}
          style={styles.assetIcon}
          resizeMode="contain"
        />
      );
    }

    if (iconFamily === 'MaterialIcons' && iconName) {
      return <MaterialIcons name={iconName} size={20} color="white" />;
    }

    if (iconFamily === 'Ionicons' && iconName) {
      return <Ionicons name={iconName} size={20} color="white" />;
    }

    // Default icon if nothing provided
    return <MaterialIcons name="home-repair-service" size={20} color="white" />;
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
      </TouchableOpacity>
      <View style={[styles.headerIconContainer, { backgroundColor }]}>
        {renderIcon()}
      </View>
      <Text style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 10,
  },
  headerIconContainer: {
    padding: 6,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  assetIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
  },
});
