import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChecklistItemProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  status?: boolean;
  onStatusChange: (status: boolean) => void;
  observation?: string;
  onObservationChange?: (text: string) => void;
  hasPhoto?: boolean;
  photoUri?: string; // Legacy single photo
  photoUris?: string[]; // Multiple photos support
  onPhotoPress?: () => void;
  onRemovePhoto?: (index: number) => void; // Remove specific photo by index
  style?: any;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  label,
  icon,
  status,
  onStatusChange,
  observation,
  onObservationChange,
  hasPhoto,
  photoUri,
  photoUris = [],
  onPhotoPress,
  onRemovePhoto,
  style,
}) => {
  // Combine legacy photoUri with photoUris array for backward compatibility
  const allPhotos = photoUri
    ? [photoUri, ...photoUris.filter(uri => uri !== photoUri)]
    : photoUris;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color="#0891B2"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.label}>{label}</Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, status && styles.statusOk]}>
            {status ? 'Ok' : status === false ? 'Obs' : ''}
          </Text>
          <Switch
            value={status === true}
            onValueChange={onStatusChange}
            trackColor={{ false: '#E5E7EB', true: '#0891B2' }}
            thumbColor={'#fff'}
          />
        </View>
      </View>

      {status === false && (
        <View style={styles.observationContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ingrese observación"
            value={observation}
            onChangeText={onObservationChange}
            multiline
          />
          {onPhotoPress && (
            <View style={styles.photoContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosScroll}>
                {allPhotos.map((uri, index) => (
                  <View key={`photo_${index}`} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => onRemovePhoto?.(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Add photo button - always visible to allow adding more */}
                <TouchableOpacity
                  onPress={onPhotoPress}
                  style={styles.cameraBtn}>
                  <Ionicons name="camera-outline" size={24} color="#6B7280" />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
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
  observationContainer: {
    marginTop: 12,
    gap: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  photoContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cameraBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  photosScroll: {
    gap: 8,
    alignItems: 'center',
  },
  photoWrapper: {
    position: 'relative',
  },
});
