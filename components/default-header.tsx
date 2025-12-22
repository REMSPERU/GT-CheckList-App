import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text, TextInput, View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';

interface DefaultHeaderProps {
  title: string;
  searchPlaceholder: string;
  shouldShowBackButton?: boolean;
  onSearch?: (text: string) => void;
}

export default function DefaultHeader({ title, searchPlaceholder, shouldShowBackButton = true, onSearch }: DefaultHeaderProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isSmall = width < 360;
  const titleFontSize = isSmall ? 18 : 18; // Constant size for consistency
  const logoSize = 32; // Fixed small size to match MaintenanceHeader
  const containerPaddingV = isSmall ? 8 : 12;
  const contentMaxWidth = Math.min(width - 40, 960);

  return (
    <View style={[styles.container, { paddingVertical: containerPaddingV }]}>
      <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>
        <View style={[styles.headerRow, { paddingVertical: 10 }]}>
          {shouldShowBackButton && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color="#1F2937"
              />
            </TouchableOpacity>
          )}
          <View style={styles.logoTitleWrapper}>
            <Image
              style={{ width: logoSize, height: logoSize }}
              source={require('../assets/logo/logo.png')}
              contentFit="contain"
            />
            <Text style={[styles.title, { fontSize: titleFontSize }]}>
              {title}
            </Text>
          </View>
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
                onChangeText={onSearch}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  inner: { width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 8 },
  logoTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontWeight: '700', color: '#1F2937' },
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
