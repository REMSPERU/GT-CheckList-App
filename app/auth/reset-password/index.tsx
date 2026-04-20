import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { Colors } from '@/constants/theme';
import { useUpdatePassword } from '@/hooks/use-auth-query';

const validatePasswordLength = (password: string) => password.length >= 8;
const validatePasswordUppercase = (password: string) => /[A-Z]/.test(password);
const validatePasswordNumber = (password: string) => /[0-9]/.test(password);
const validatePasswordSpecialChar = (password: string) =>
  /[!@#$%^&*(),.?":{}|<>]/.test(password);

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const updatePasswordMutation = useUpdatePassword();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const validations = useMemo(
    () => ({
      length: {
        valid: validatePasswordLength(password),
        text: 'Mínimo 8 caracteres',
        touched: password.length > 0,
      },
      uppercase: {
        valid: validatePasswordUppercase(password),
        text: 'Al menos 1 letra mayúscula',
        touched: password.length > 0,
      },
      number: {
        valid: validatePasswordNumber(password),
        text: 'Al menos 1 número',
        touched: password.length > 0,
      },
      specialChar: {
        valid: validatePasswordSpecialChar(password),
        text: 'Al menos 1 carácter especial (!@#$%^&*...)',
        touched: password.length > 0,
      },
    }),
    [password],
  );

  const isPasswordValid = useMemo(
    () =>
      validations.length.valid &&
      validations.uppercase.valid &&
      validations.number.valid &&
      validations.specialChar.valid,
    [validations],
  );

  const passwordsMatch = password === confirmPassword && password.length > 0;

  const isFormValid = isPasswordValid && passwordsMatch;

  useEffect(() => {
    if (params.email) {
      console.log('Reset password for email:', params.email);
    }
  }, [params.email]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert(
        'Error',
        'Por favor, completa todos los requisitos de la contraseña',
      );
      return;
    }

    if (!passwordsMatch) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync(password);
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la contraseña';
      Alert.alert('Error', message);
    }
  };

  const RequirementItem = ({
    validation,
  }: {
    validation: { valid: boolean; text: string; touched: boolean };
  }) => {
    const getColor = () => {
      if (!validation.touched) return '#9CA3AF';
      return validation.valid ? '#10B981' : '#EF4444';
    };

    const getIcon = () => {
      if (!validation.touched) return 'ellipse-outline';
      return validation.valid ? 'checkmark-circle' : 'close-circle';
    };

    return (
      <View style={styles.requirementItem}>
        <Ionicons name={getIcon()} size={16} color={getColor()} />
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
          <Pressable
            onPress={() => router.replace('/auth/login')}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.headerText}>Nueva contraseña</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Image
            source={require('../../../assets/logo/image.png')}
            style={styles.logo}
            contentFit="contain"
            transition={1000}
          />

          <Text style={styles.description}>
            Ingresa tu nueva contraseña. Debe cumplir con los siguientes
            requisitos:
          </Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={Colors.light.icon}
                style={styles.icon}
              />
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused,
                ]}
                placeholder="Nueva contraseña"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                editable={!updatePasswordMutation.isPending}
                accessibilityLabel="Nueva contraseña"
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={updatePasswordMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.light.icon}
                />
              </Pressable>
            </View>

            {password.length > 0 && (
              <View style={styles.requirementsContainer}>
                <RequirementItem validation={validations.length} />
                <RequirementItem validation={validations.uppercase} />
                <RequirementItem validation={validations.number} />
                <RequirementItem validation={validations.specialChar} />
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
                style={[
                  styles.input,
                  focusedInput === 'confirm' && styles.inputFocused,
                ]}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="done"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedInput('confirm')}
                onBlur={() => setFocusedInput(null)}
                onSubmitEditing={handleSubmit}
                editable={!updatePasswordMutation.isPending}
                accessibilityLabel="Confirmar contraseña"
              />
            </View>

            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={updatePasswordMutation.isPending || !isFormValid}
              style={({ pressed }) => [
                styles.button,
                (updatePasswordMutation.isPending || !isFormValid) &&
                  styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button">
              {updatePasswordMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Actualizar contraseña</Text>
              )}
            </Pressable>
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 24,
  },
  description: {
    fontSize: 14,
    color: '#565D6D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
    padding: 4,
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
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    width: '100%',
  },
  button: {
    width: '100%',
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
