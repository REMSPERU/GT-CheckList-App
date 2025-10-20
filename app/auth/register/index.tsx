import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading, error, clearError } = useAuth();

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        // Clear previous errors
        clearError();

        // Validation
        if (!email.trim() || !username.trim() || !password.trim()) {
            Alert.alert('Error', 'Por favor, completa todos los campos');
            return;
        }

        try {
            await register({
                email: email.trim(),
                username: username.trim(),
                password: password,
            });
            // Navigation is handled automatically by AuthContext
        } catch (err) {
            // Error is already set in context
            Alert.alert(
                'Error de registro',
                error || 'No se pudo crear la cuenta. Inténtalo de nuevo.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <SafeAreaView style={styles.page}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Crear cuenta</Text>
                </View>

                <View style={styles.content}>
                    <Image source={require('../../../assets/logo/image.png')} style={styles.logo} contentFit="contain" transition={1000} />

                    <View style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color={Colors.light.icon} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Correo electrónico"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color={Colors.light.icon} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre de usuario"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="none"
                                value={username}
                                onChangeText={setUsername}
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.light.icon} style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Contraseña"
                                placeholderTextColor="#9CA3AF"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                value={password}
                                onChangeText={setPassword}
                                editable={!isLoading}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.light.icon} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={handleRegister} disabled={isLoading} style={[styles.button, isLoading && styles.buttonDisabled]}>
                            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            disabled={isLoading} 
                            style={styles.secondaryButton}
                            onPress={() => router.push('/auth/login')}
                        >
                            <Text style={styles.secondaryButtonText}>Iniciar sesión</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    page: {
        flex: 1,
        backgroundColor: '#E8E9E9',
    },
    header: {
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    logo: {
        width: 260,
        height: 120,
        marginBottom: 32,
    },
    form: {
        width: '100%',
        alignItems: 'center',
    },
    inputWrapper: {
        width: '100%',
        marginBottom: 12,
        position: 'relative',
    },
    input: {
        height: 52,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingLeft: 44,
        paddingRight: 44,
        fontSize: 16,
        lineHeight: 26,
        color: '#565D6D',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    icon: {
        position: 'absolute',
        left: 12,
        top: 16,
        zIndex: 10,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 16,
        zIndex: 10,
    },
    button: {
        width: '100%',
        backgroundColor: Colors.light.tint,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    secondaryButton: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: Colors.light.tint,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    secondaryButtonText: {
        color: Colors.light.tint,
        fontWeight: '600',
    },
});