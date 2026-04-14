import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sessionScreenStyles } from './session-screen-styles';

interface SessionHeaderProps {
  buildingImageUrl?: string;
  buildingName?: string;
  scheduledFor: string;
  onBack: () => void;
}

export function SessionHeader({
  buildingImageUrl,
  buildingName,
  scheduledFor,
  onBack,
}: SessionHeaderProps) {
  return (
    <View style={sessionScreenStyles.headerContainer}>
      <Pressable
        style={({ pressed }) => [
          sessionScreenStyles.backButton,
          pressed && sessionScreenStyles.pressed,
        ]}
        onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </Pressable>
      <Image
        source={
          buildingImageUrl
            ? { uri: buildingImageUrl }
            : require('@/assets/images/icon.png')
        }
        style={sessionScreenStyles.headerImage}
        contentFit="cover"
      />
      <View style={sessionScreenStyles.overlay} />
      <View style={sessionScreenStyles.headerContent}>
        <Text style={sessionScreenStyles.headerTitle} numberOfLines={2}>
          {buildingName || 'Auditoria'}
        </Text>
        <Text style={sessionScreenStyles.headerSubtitle}>
          Fecha de auditoria: {scheduledFor}
        </Text>
      </View>
    </View>
  );
}
