import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface MaintenanceCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    onPress?: () => void;
}

export default function MaintenanceCard({ icon, title, onPress }: MaintenanceCardProps) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.iconWrapper}>
                    <Ionicons name={icon} size={24} color="#06B6D4" />
                </View>
                <Text style={styles.title}>
                    {title}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#171a1f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
    color: '#1F2937',
    flex: 1,
  }
});
