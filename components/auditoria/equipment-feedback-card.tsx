import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface EquipmentFeedbackValue {
  goodPracticesComment: string;
  goodPracticesPhotos: string[];
  improvementOpportunityComment: string;
  improvementOpportunityPhotos: string[];
}

interface EquipmentFeedbackCardProps {
  equipmentLabel: string;
  value: EquipmentFeedbackValue;
  disabled?: boolean;
  onChangeGoodPracticesComment: (text: string) => void;
  onAddGoodPracticesPhoto: () => void;
  onRemoveGoodPracticesPhoto: (photoIndex: number) => void;
  onChangeImprovementOpportunityComment: (text: string) => void;
  onAddImprovementOpportunityPhoto: () => void;
  onRemoveImprovementOpportunityPhoto: (photoIndex: number) => void;
}

export function EquipmentFeedbackCard({
  equipmentLabel,
  value,
  disabled = false,
  onChangeGoodPracticesComment,
  onAddGoodPracticesPhoto,
  onRemoveGoodPracticesPhoto,
  onChangeImprovementOpportunityComment,
  onAddImprovementOpportunityPhoto,
  onRemoveImprovementOpportunityPhoto,
}: EquipmentFeedbackCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.equipmentTitle}>{equipmentLabel}</Text>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Buenas practicas</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Escriba buenas practicas observadas"
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          editable={!disabled}
          value={value.goodPracticesComment}
          onChangeText={onChangeGoodPracticesComment}
        />
        <PhotoRow
          uris={value.goodPracticesPhotos}
          disabled={disabled}
          onAddPhoto={onAddGoodPracticesPhoto}
          onRemovePhoto={onRemoveGoodPracticesPhoto}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Oportunidad de mejora</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Escriba oportunidad de mejora"
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          editable={!disabled}
          value={value.improvementOpportunityComment}
          onChangeText={onChangeImprovementOpportunityComment}
        />
        <PhotoRow
          uris={value.improvementOpportunityPhotos}
          disabled={disabled}
          onAddPhoto={onAddImprovementOpportunityPhoto}
          onRemovePhoto={onRemoveImprovementOpportunityPhoto}
        />
      </View>
    </View>
  );
}

interface PhotoRowProps {
  uris: string[];
  disabled: boolean;
  onAddPhoto: () => void;
  onRemovePhoto: (photoIndex: number) => void;
}

function PhotoRow({
  uris,
  disabled,
  onAddPhoto,
  onRemovePhoto,
}: PhotoRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photosRow}>
      {uris.map((uri, index) => (
        <View key={`${uri}-${index}`} style={styles.photoWrap}>
          <Image
            source={{ uri }}
            style={styles.photo}
            contentFit="cover"
            transition={80}
          />
          <Pressable
            onPress={() => onRemovePhoto(index)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.removePhotoBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button">
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={onAddPhoto}
        disabled={disabled}
        style={({ pressed }) => [styles.addPhotoBtn, pressed && styles.pressed]}
        accessibilityRole="button">
        <Ionicons name="camera-outline" size={20} color="#475569" />
        <Text style={styles.addPhotoText}>Agregar foto</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D9E1EC',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  equipmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A647C',
  },
  block: {
    gap: 6,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#0F172A',
    fontSize: 14,
  },
  photosRow: {
    gap: 6,
    alignItems: 'center',
  },
  photoWrap: {
    width: 62,
    height: 62,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
  },
  addPhotoBtn: {
    minWidth: 78,
    height: 62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 2,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pressed: {
    opacity: 0.84,
  },
});
