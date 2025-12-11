import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text, TextInput, View, StyleSheet, useWindowDimensions } from 'react-native';

interface DefaultHeaderProps {
    title: string;
    searchPlaceholder: string;
    shouldShowBackButton?: boolean;
}

export default function DefaultHeader({ title, searchPlaceholder, shouldShowBackButton = true }: DefaultHeaderProps) {
    const router = useRouter();
    const { width } = useWindowDimensions();

    const isSmall = width < 360;
    const isTablet = width >= 768;
    const titleFontSize = isSmall ? 18 : isTablet ? 22 : 20;
    const logoSize = isSmall ? 36 : isTablet ? 44 : 40;
    const containerPaddingV = isSmall ? 12 : 16;
    const contentMaxWidth = Math.min(width - 48, 960);

    return (
        <View style={[styles.container, { paddingVertical: containerPaddingV }]}>
            <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>
                <View style={styles.headerRow}>
                    <View style={styles.logoTitleWrapper}>
                        <Image
                            style={{ width: logoSize, height: logoSize }}
                            source={require('../assets/logo/logo.png')}
                            contentFit="contain"
                        />
                        <Text style={[styles.title, { fontSize: titleFontSize }]} numberOfLines={1}>
                            {title}
                        </Text>
                    </View>
                    {shouldShowBackButton && (
                        <View>
                            <Ionicons
                                accessibilityRole="button"
                                name="arrow-back"
                                size={isSmall ? 22 : 24}
                                color="#1F2937"
                                onPress={() => router.back()}
                            />
                        </View>
                    )}
                </View>

                {searchPlaceholder.length > 0 && (
                    <View style={styles.searchWrapper}>
                        <View style={styles.searchInner}>
                            <Ionicons
                                name="search-outline"
                                size={16}
                                color="#BDC1CA"
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                placeholderTextColor="#BDC1CA"
                            />
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
    inner: { width: '100%', alignSelf: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    logoTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontWeight: '600', color: '#1F2937' },
    searchWrapper: { marginTop: 12 },
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
    searchIcon: { position: 'absolute', left: 12, top: 13, zIndex: 10 }
});
