import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text, TextInput, View, StyleSheet } from 'react-native';

interface DefaultHeaderProps {
    title: string;
    searchPlaceholder: string;
    shouldShowBackButton?: boolean;
}

export default function DefaultHeader({ title, searchPlaceholder, shouldShowBackButton = true }: DefaultHeaderProps) {
    const router = useRouter();
    return (
        <View style={styles.container}>
            {/* Logo - posición top: 6px, left: 4px (relativo al padding) */}
            <View style={styles.logoWrapper}>
                <Image
                    style={styles.logo}
                    source={require('../assets/logo/image.png')}
                    contentFit="contain"
                />
            </View>

            {/* Título */}
            <View style={styles.titleWrapper}>
                <Text style={styles.title}>{title}</Text>
            </View>

            {/* Barra de búsqueda - top: 88px desde el container */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchInner}>
                    <Ionicons
                        name="search-outline"
                        size={16}
                        color="#BDC1CA"
                        style={{ position: 'absolute', left: 12, top: 13, zIndex: 10 }}
                    />
                    <TextInput
                        style={{
                            ...styles.searchInput
                        }}
                        placeholder={searchPlaceholder}
                        placeholderTextColor="#BDC1CA"
                    />
                </View>
            </View>
            {/** Boton para regresar usando el router */}
            {shouldShowBackButton && (
            <View style={styles.backButton}>
                <Ionicons
                    name="arrow-back"
                    size={24}
                    color="#1F2937"
                    onPress={() => router.back()}
                />
            </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#FFFFFF', height: 147, paddingHorizontal: 24 },
    logoWrapper: { marginTop: 6, marginLeft: 4 },
    logo: { width: 93, height: 27 },
    titleWrapper: { marginTop: 10 },
    title: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
    searchWrapper: { position: 'absolute', top: 88, left: 24, right: 24 },
    searchInner: { position: 'relative' },
    searchInput: {
        height: 42,
        paddingLeft: 34,
        paddingRight: 12,
        fontSize: 16,
        lineHeight: 26,
        fontWeight: '400',
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#3892B0',
        color: '#BDC1CA'
    },
    searchIcon: { position: 'absolute', left: 12, top: 13, zIndex: 10 },
    backButton: { position: 'absolute', top: 16, right: 24 }
});
