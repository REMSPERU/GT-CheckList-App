import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, TextInput, View } from 'react-native';

interface DefaultHeaderProps {
    title: string;
    searchPlaceholder: string;
}

export default function DefaultHeader({ title, searchPlaceholder }: DefaultHeaderProps) {
    return (
        <View style={{ backgroundColor: '#FFFFFF', height: 147, paddingHorizontal: 24 }}>
            {/* Logo - posición top: 6px, left: 4px (relativo al padding) */}
            <View style={{ marginTop: 6, marginLeft: 4 }}>
                <Image
                    style={{ width: 93, height: 27 }}
                    source={require('../assets/logo/image.png')}
                    contentFit="contain"
                />
            </View>

            {/* Título */}
            <View className="items-center" style={{ marginTop: 10 }}>
                <Text className="text-xl font-semibold text-gray-900">{title}</Text>
            </View>

            {/* Barra de búsqueda - top: 88px desde el container */}
            <View style={{ position: 'absolute', top: 88, left: 24, right: 24 }}>
                <View className="relative">
                    <Ionicons
                        name="search-outline"
                        size={16}
                        color="#BDC1CA"
                        style={{ position: 'absolute', left: 12, top: 13, zIndex: 10 }}
                    />
                    <TextInput
                        style={{
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
                        }}
                        placeholder={searchPlaceholder}
                        placeholderTextColor="#BDC1CA"
                    />
                </View>
            </View>
        </View>
    );
}
