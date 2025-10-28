import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

interface BuildingCardProps {
    initial: string;
    name: string;
    onPress?: () => void;
}

export default function BuildingCard({ initial, name, onPress }: BuildingCardProps) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.contentWrapper}>
                <View
                    style={styles.avatar}
                >
                    <Text style={styles.initialText}>
                        {initial}
                    </Text>
                </View>
                <Text style={styles.nameText}>
                    {name}
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
    contentWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#06B6D4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    initialText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    nameText: {
        fontSize: 16,
        color: '#1F2937',
    },
});