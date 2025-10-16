import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            <View className="flex-1 px-6 py-8">
                {/* Header */}
                <View className="items-center justify-center pt-2 pb-6">
                    <Text className="text-black text-xl font-normal">Bienvenido a</Text>
                </View>

                {/* Logo */}
                <View className="items-center justify-center mb-8 h-56">
                    <Image
                        style={{ width: 283, height: 100, paddingLeft:19, paddingRight:19 }}
                        source={require('../../../assets/logo/image.png')}
                        contentFit="contain"
                        transition={1000}
                    />
                </View>

                {/* Formulario */}
                <View className="flex-1">
                    {/* Input Correo electrónico */}
                    <View className="mb-4 relative">
                        <Ionicons 
                            name="mail-outline" 
                            size={16} 
                            color="#565D6D" 
                            style={{ position: 'absolute', left: 12, top: 18, zIndex: 10 }} 
                        />
                        <TextInput
                            style={{
                                height: 52,
                                paddingLeft: 34,
                                paddingRight: 12,
                                fontSize: 16,
                                lineHeight: 26,
                                fontWeight: '400',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 10,
                                borderWidth: 0,
                                color: '#565D6D'
                            }}
                            placeholder="Correo electrónico"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Input Contraseña */}
                    <View className="mb-3 relative">
                        <Ionicons 
                            name="lock-closed-outline" 
                            size={16} 
                            color="#565D6D" 
                            style={{ position: 'absolute', left: 12, top: 18, zIndex: 10 }} 
                        />
                        <TextInput
                            style={{
                                height: 52,
                                paddingLeft: 34,
                                paddingRight: 12,
                                fontSize: 16,
                                lineHeight: 26,
                                fontWeight: '400',
                                backgroundColor: '#FFFFFF',
                                borderRadius: 10,
                                borderWidth: 0,
                                color: '#565D6D'
                            }}
                            placeholder="Contraseña"
                            secureTextEntry
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Olvidaste tu contraseña */}
                    <TouchableOpacity style={{ marginBottom: 116 }}>
                        <Text className="text-cyan-500 text-right text-sm">¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>

                    {/* Botón Iniciar sesión */}
                    <TouchableOpacity 
                        className="bg-cyan-500 rounded-xl p-4 mb-4 items-center shadow-sm" 
                        onPress={() => router.replace('/(tabs)')}
                    >
                        <Text className="text-white text-base font-semibold">Iniciar sesión</Text>
                    </TouchableOpacity>

                    {/* Botón Crear cuenta */}
                    <TouchableOpacity className="bg-white border-2 border-cyan-500 rounded-xl p-4 items-center shadow-sm">
                        <Text className="text-cyan-500 text-base font-semibold">Crear cuenta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}