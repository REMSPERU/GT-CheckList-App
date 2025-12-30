import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  Image,
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
  photoUri?: string;
  onPhotoPress?: () => void;
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
  onPhotoPress,
  style,
}) => {
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
              {photoUri ? (
                <View>
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={onPhotoPress}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={onPhotoPress}
                  style={styles.cameraBtn}>
                  <Ionicons name="camera-outline" size={24} color="#6B7280" />
                </TouchableOpacity>
              )}
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
});
