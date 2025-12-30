import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Validation functions
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username: string) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  return usernameRegex.test(username);
};

const validatePasswordLength = (password: string) => password.length >= 8;
const validatePasswordUppercase = (password: string) => /[A-Z]/.test(password);
const validatePasswordNumber = (password: string) => /[0-9]/.test(password);
const validatePasswordSpecialChar = (password: string) =>
  /[!@#$%^&*(),.?":{}|<>]/.test(password);

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation states
  const validations = useMemo(
    () => ({
      email: {
        valid: validateEmail(email),
        text: 'Correo electrónico válido',
        touched: email.length > 0,
      },
      username: {
        valid: validateUsername(username),
        text: 'Usuario: 3-50 caracteres, alfanumérico + guión bajo',
        touched: username.length > 0,
      },
      passwordLength: {
        valid: validatePasswordLength(password),
        text: 'Mínimo 8 caracteres',
        touched: password.length > 0,
      },
      passwordUppercase: {
        valid: validatePasswordUppercase(password),
        text: 'Al menos 1 letra mayúscula',
        touched: password.length > 0,
      },
      passwordNumber: {
        valid: validatePasswordNumber(password),
        text: 'Al menos 1 número',
        touched: password.length > 0,
      },
      passwordSpecialChar: {
        valid: validatePasswordSpecialChar(password),
        text: 'Al menos 1 carácter especial (!@#$%^&*...)',
        touched: password.length > 0,
      },
    }),
    [email, username, password],
  );

  const isFormValid = useMemo(() => {
    return (
      validations.email.valid &&
      validations.username.valid &&
      validations.passwordLength.valid &&
      validations.passwordUppercase.valid &&
      validations.passwordNumber.valid &&
      validations.passwordSpecialChar.valid
    );
  }, [validations]);

  const handleRegister = async () => {
    // Clear previous errors
    clearError();

    // Validation
    if (!isFormValid) {
      Alert.alert(
        'Error',
        'Por favor, completa todos los campos correctamente',
      );
      return;
    }

    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password: password,
      });

      // Registro exitoso - mostrar mensaje y redirigir al login
      Alert.alert(
        'Cuenta creada',
        'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.push('/auth/login'),
          },
        ],
      );
    } catch {
      // Error is already set in context
      Alert.alert(
        'Error de registro',
        error || 'No se pudo crear la cuenta. Inténtalo de nuevo.',
        [{ text: 'OK' }],
      );
    }
  };

  const RequirementItem = ({
    validation,
    iconName,
  }: {
    validation: { valid: boolean; text: string; touched: boolean };
    iconName: keyof typeof Ionicons.glyphMap;
  }) => {
    const getColor = () => {
      if (!validation.touched) return '#9CA3AF'; // Gray for untouched
      return validation.valid ? '#10B981' : '#EF4444'; // Green for valid, Red for invalid
    };

    const getIcon = () => {
      if (!validation.touched) return 'ellipse-outline';
      return validation.valid ? 'checkmark-circle' : 'close-circle';
    };

    return (
      <View style={styles.requirementItem}>
        <Ionicons name={getIcon()} size={18} color={getColor()} />
        <Text style={[styles.requirementText, { color: getColor() }]}>
          {validation.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Crear cuenta</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}>
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

              {/* Email validation */}
              {email.length > 0 && !validations.email.valid && (
                <View style={styles.requirementsContainer}>
                  <RequirementItem
                    validation={validations.email}
                    iconName="mail-outline"
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={Colors.light.icon}
                  style={styles.icon}
                />
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

              {/* Username validation */}
              {username.length > 0 && !validations.username.valid && (
                <View style={styles.requirementsContainer}>
                  <RequirementItem
                    validation={validations.username}
                    iconName="person-outline"
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.light.icon}
                  style={styles.icon}
                />
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
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.light.icon}
                  />
                </TouchableOpacity>
              </View>

              {/* Password validations */}
              {password.length > 0 &&
                !(
                  validations.passwordLength.valid &&
                  validations.passwordUppercase.valid &&
                  validations.passwordNumber.valid &&
                  validations.passwordSpecialChar.valid
                ) && (
                  <View style={styles.requirementsContainer}>
                    <RequirementItem
                      validation={validations.passwordLength}
                      iconName="lock-closed-outline"
                    />
                    <RequirementItem
                      validation={validations.passwordUppercase}
                      iconName="lock-closed-outline"
                    />
                    <RequirementItem
                      validation={validations.passwordNumber}
                      iconName="lock-closed-outline"
                    />
                    <RequirementItem
                      validation={validations.passwordSpecialChar}
                      iconName="lock-closed-outline"
                    />
                  </View>
                )}

              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading || !isFormValid}
                style={[
                  styles.button,
                  (isLoading || !isFormValid) && styles.buttonDisabled,
                ]}>
                {isLoading ? (
                  <View style={styles.buttonLoadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.buttonText, styles.buttonLoadingText]}>
                      Creando cuenta...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Crear cuenta</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isLoading}
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/login')}>
                <Text style={styles.secondaryButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
  requirementsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  requirementText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
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
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonLoadingText: {
    marginLeft: 8,
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
