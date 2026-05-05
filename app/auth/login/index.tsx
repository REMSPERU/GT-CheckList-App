import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(
    null,
  );
  const passwordInputRef = useRef<TextInput>(null);
  const forgotPasswordHref = '/auth/forgot-password' as Href;

  const handleInputFocus = (field: 'email' | 'password') => {
    setFocusedInput(field);
  };

  const handleInputBlur = () => {
    setFocusedInput(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);

    requestAnimationFrame(() => {
      passwordInputRef.current?.focus();
    });
  };

  const handleLogin = async () => {
    clearError();

    if (!emailOrUsername.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (/\s/.test(password)) {
      Alert.alert('Error', 'La contraseña no debe contener espacios.');
      return;
    }

    try {
      await login({ email_or_username: emailOrUsername.trim(), password });
    } catch (err) {
      Alert.alert(
        'Error de inicio de sesión',
        error || 'No se pudo iniciar sesión. Verifica tus credenciales.',
      );
      console.error('Login error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.backgroundAccentTop} />
      <View style={styles.backgroundAccentBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.brandBlock}>
              <View style={styles.logoShell}>
                <Image
                  source={require('../../../assets/logo/image.png')}
                  style={styles.logo}
                  contentFit="contain"
                  transition={1000}
                />
              </View>
              <Text style={styles.title}>Bienvenido</Text>
              <Text style={styles.subtitle}>
                Ingresa para continuar con tus mantenimientos.
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Iniciar sesión</Text>
                <Text style={styles.formSubtitle}>
                  Usa tu correo o usuario registrado.
                </Text>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === 'email' && styles.inputWrapperFocused,
                ]}>
                <View style={styles.iconShell}>
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={
                      focusedInput === 'email'
                        ? Colors.light.tint
                        : Colors.light.icon
                    }
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Correo o usuario"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  value={emailOrUsername}
                  onChangeText={setEmailOrUsername}
                  onFocus={() => handleInputFocus('email')}
                  onBlur={handleInputBlur}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!isLoading}
                  accessibilityLabel="Correo o usuario"
                />
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === 'password' && styles.inputWrapperFocused,
                ]}>
                <View style={styles.iconShell}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={
                      focusedInput === 'password'
                        ? Colors.light.tint
                        : Colors.light.icon
                    }
                  />
                </View>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  multiline={false}
                  blurOnSubmit
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  smartInsertDelete={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => handleInputFocus('password')}
                  onBlur={handleInputBlur}
                  editable={!isLoading}
                  accessibilityLabel="Contraseña"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.eyeIcon,
                    pressed && styles.pressed,
                  ]}
                  onPress={togglePasswordVisibility}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.light.icon}
                  />
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.forgotWrapper,
                  pressed && styles.pressed,
                ]}
                disabled={isLoading}
                onPress={() => router.push(forgotPasswordHref)}
                accessibilityRole="button">
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <Pressable
                onPress={handleLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.button,
                  isLoading && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button">
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Iniciar sesión</Text>
                )}
              </Pressable>

              <Pressable
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push('/auth/register')}
                accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>
                  ¿No tienes cuenta? Crear cuenta
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    flex: 1,
    backgroundColor: '#EEF3F4',
  },
  backgroundAccentTop: {
    position: 'absolute',
    top: -96,
    right: -72,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#CFF7FD',
    opacity: 0.88,
  },
  backgroundAccentBottom: {
    position: 'absolute',
    bottom: 70,
    left: -110,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
    opacity: 0.72,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 22,
  },
  brandBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  logoShell: {
    width: 178,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 14px 34px rgba(17, 24, 39, 0.08)',
  },
  logo: {
    width: 148,
    height: 62,
  },
  title: {
    marginTop: 6,
    color: Colors.light.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    maxWidth: 290,
    color: '#5B6573',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 18px 48px rgba(17, 24, 39, 0.12)',
  },
  formHeader: {
    width: '100%',
    marginBottom: 18,
    gap: 4,
  },
  formTitle: {
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  formSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrapper: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingLeft: 12,
    paddingRight: 12,
  },
  inputWrapperFocused: {
    borderColor: Colors.light.tint,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.12)',
  },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 0,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    fontSize: 16,
    lineHeight: 22,
    color: Colors.light.text,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  iconShell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#ECFEFF',
  },
  eyeIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: -2,
    marginBottom: 20,
  },
  forgotText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    backgroundColor: Colors.light.tint,
    minHeight: 54,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 22px rgba(6, 182, 212, 0.26)',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#ECFEFF',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.84,
  },
});
