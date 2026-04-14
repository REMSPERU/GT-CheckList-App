import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNetworkState } from 'expo-network';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const networkState = useNetworkState();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(
    null,
  );
  const passwordInputRef = useRef<TextInput>(null);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Bienvenido</Text>
        </View>

        <View style={styles.content}>
          <Image
            source={require('../../../assets/logo/image.png')}
            style={styles.logo}
            contentFit="contain"
            transition={1000}
          />

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={Colors.light.icon}
                style={styles.icon}
              />
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused,
                ]}
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

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.light.icon}
                style={styles.icon}
              />
              <TextInput
                ref={passwordInputRef}
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused,
                ]}
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
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/register')}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.networkStatusContainer}>
          <Text style={styles.networkStatusText}>
            {networkState.isConnected
              ? 'Conexión a internet'
              : 'Sin conexión a internet'}
          </Text>
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
    justifyContent: 'center',
  },
  input: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingLeft: 44,
    paddingRight: 44,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    fontSize: 16,
    lineHeight: 22,
    color: '#565D6D',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputFocused: {
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -10,
    zIndex: 10,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
    zIndex: 10,
  },
  forgotWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: Colors.light.tint,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
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
  networkStatusContainer: {
    height: 16,
    alignItems: 'center',
  },
  networkStatusText: {
    color: Colors.light.text,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.84,
  },
});
