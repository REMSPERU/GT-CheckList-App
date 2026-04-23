import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabaseAuthService } from '@/services/supabase-auth.service';

interface RecoveryParams {
  type: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenHash: string | null;
  token: string | null;
}

function pickParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function extractRecoveryParams(url: string): RecoveryParams {
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const queryPart = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams();

  for (const part of [queryPart, hashPart]) {
    if (!part) continue;

    const sourceParams = new URLSearchParams(part);
    for (const [key, value] of sourceParams.entries()) {
      params.set(key, value);
    }
  }

  return {
    type: params.get('type'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    tokenHash: params.get('token_hash'),
    token: params.get('token'),
  };
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

function mapResetErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'No se pudo actualizar la contrasena.';
  }

  const normalized = error.message.toLowerCase();

  if (normalized.includes('same_password')) {
    return 'La nueva contrasena debe ser diferente a la anterior.';
  }

  if (normalized.includes('session') || normalized.includes('otp')) {
    return 'El enlace de recuperacion es invalido o expiro. Solicita uno nuevo.';
  }

  if (normalized.includes('network')) {
    return 'Sin conexion a internet. Intenta nuevamente.';
  }

  return error.message;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const loginHref = '/auth/login' as Href;
  const tabsHref = '/(tabs)' as Href;
  const forgotPasswordHref = '/auth/forgot-password' as Href;
  const currentUrl = Linking.useURL();
  const searchParams = useLocalSearchParams<{
    type?: string | string[];
    access_token?: string | string[];
    refresh_token?: string | string[];
    token_hash?: string | string[];
    token?: string | string[];
  }>();
  const { isAuthenticated } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingLink, setIsResolvingLink] = useState(!isAuthenticated);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [receivedUrl, setReceivedUrl] = useState<string | null>(currentUrl);

  const routeRecoveryParams = useMemo<RecoveryParams>(
    () => ({
      type: pickParam(searchParams.type),
      accessToken: pickParam(searchParams.access_token),
      refreshToken: pickParam(searchParams.refresh_token),
      tokenHash: pickParam(searchParams.token_hash),
      token: pickParam(searchParams.token),
    }),
    [searchParams],
  );

  const recoveryParams = useMemo(() => {
    const hasRouteParams =
      Boolean(routeRecoveryParams.type) ||
      Boolean(routeRecoveryParams.accessToken) ||
      Boolean(routeRecoveryParams.refreshToken) ||
      Boolean(routeRecoveryParams.tokenHash) ||
      Boolean(routeRecoveryParams.token);

    if (!receivedUrl) {
      return hasRouteParams ? routeRecoveryParams : null;
    }

    const parsed = extractRecoveryParams(receivedUrl);

    return {
      type: parsed.type ?? routeRecoveryParams.type,
      accessToken: parsed.accessToken ?? routeRecoveryParams.accessToken,
      refreshToken: parsed.refreshToken ?? routeRecoveryParams.refreshToken,
      tokenHash: parsed.tokenHash ?? routeRecoveryParams.tokenHash,
      token: parsed.token ?? routeRecoveryParams.token,
    };
  }, [receivedUrl, routeRecoveryParams]);

  const canSubmit = useMemo(() => {
    return (
      isStrongPassword(password) &&
      confirmPassword.length > 0 &&
      password === confirmPassword
    );
  }, [password, confirmPassword]);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);

  useEffect(() => {
    if (currentUrl) {
      setReceivedUrl(currentUrl);
    }
  }, [currentUrl]);

  useEffect(() => {
    if (isAuthenticated) {
      setIsResolvingLink(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    void Linking.getInitialURL().then(initialUrl => {
      if (isMounted && initialUrl) {
        setReceivedUrl(prev => prev ?? initialUrl);
      }
    });

    const subscription = Linking.addEventListener('url', event => {
      setReceivedUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!recoveryParams) {
      if (!isAuthenticated) {
        setIsResolvingLink(false);
      }
      return;
    }

    const resolveRecoveryLink = async () => {
      try {
        const { type, accessToken, refreshToken, tokenHash, token } =
          recoveryParams;

        if (type?.toLowerCase() !== 'recovery') {
          return;
        }

        if (accessToken && refreshToken) {
          await supabaseAuthService.setRecoverySession(
            accessToken,
            refreshToken,
          );
        } else {
          const recoveryTokenHash = tokenHash ?? token;
          if (!recoveryTokenHash) {
            return;
          }

          await supabaseAuthService.verifyRecoveryToken(recoveryTokenHash);
        }

        setIsRecoveryFlow(true);
      } catch (error) {
        console.error('[ResetPassword] Error al procesar enlace:', error);
      } finally {
        setIsResolvingLink(false);
      }
    };

    void resolveRecoveryLink();
  }, [isAuthenticated, recoveryParams]);

  const handleUpdatePassword = async () => {
    if (!canSubmit) {
      Alert.alert(
        'Error',
        'Verifica que la contrasena cumpla los requisitos y coincida en ambos campos.',
      );
      return;
    }

    setIsLoading(true);

    try {
      await supabaseAuthService.updatePassword(password, {
        clearTemporaryPasswordFlag: true,
      });

      if (isRecoveryFlow) {
        try {
          await supabaseAuthService.signOut();
        } catch (error) {
          console.warn('[ResetPassword] No se pudo cerrar sesion:', error);
        }

        Alert.alert(
          'Contrasena actualizada',
          'Tu contrasena fue cambiada. Inicia sesion con tu nueva contrasena.',
          [{ text: 'OK', onPress: () => router.replace(loginHref) }],
        );
        return;
      }

      Alert.alert(
        'Contrasena actualizada',
        'Tu contrasena se cambio correctamente.',
        [{ text: 'OK', onPress: () => router.replace(tabsHref) }],
      );
    } catch (error) {
      Alert.alert('Error', mapResetErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowForm = isAuthenticated || isRecoveryFlow;

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Cambiar contrasena</Text>
        </View>

        <View style={styles.content}>
          {isResolvingLink ? (
            <View style={styles.centeredBox}>
              <ActivityIndicator size="small" color="#0089AC" />
              <Text style={styles.statusText}>Validando enlace...</Text>
            </View>
          ) : shouldShowForm ? (
            <>
              <Text style={styles.description}>
                Crea una nueva contrasena segura para tu cuenta.
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.light.icon}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nueva contrasena"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.eyeIcon,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setShowPassword(prev => !prev)}
                  disabled={isLoading}
                  accessibilityRole="button">
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.light.icon}
                  />
                </Pressable>
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.light.icon}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmar contrasena"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.eyeIcon,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setShowConfirmPassword(prev => !prev)}
                  disabled={isLoading}
                  accessibilityRole="button">
                  <Ionicons
                    name={
                      showConfirmPassword ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={20}
                    color={Colors.light.icon}
                  />
                </Pressable>
              </View>

              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>
                  Tu contrasena debe incluir:
                </Text>
                <Text
                  style={[
                    styles.rulesItem,
                    passwordChecks.minLength && styles.rulesItemValid,
                  ]}>
                  - Minimo 8 caracteres
                </Text>
                <Text
                  style={[
                    styles.rulesItem,
                    passwordChecks.hasUppercase && styles.rulesItemValid,
                  ]}>
                  - Una letra mayuscula
                </Text>
                <Text
                  style={[
                    styles.rulesItem,
                    passwordChecks.hasNumber && styles.rulesItemValid,
                  ]}>
                  - Un numero
                </Text>
                <Text
                  style={[
                    styles.rulesItem,
                    passwordChecks.hasSpecialChar && styles.rulesItemValid,
                  ]}>
                  - Un caracter especial
                </Text>
              </View>

              {confirmPassword.length > 0 && password !== confirmPassword ? (
                <Text style={styles.passwordMismatchText}>
                  Las contrasenas no coinciden.
                </Text>
              ) : null}

              <Pressable
                onPress={handleUpdatePassword}
                disabled={isLoading || !canSubmit}
                style={({ pressed }) => [
                  styles.button,
                  (isLoading || !canSubmit) && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button">
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    Guardar nueva contrasena
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.centeredBox}>
              <Text style={styles.statusText}>
                Este enlace no es valido o expiro. Solicita un nuevo correo de
                recuperacion.
              </Text>
              <Pressable
                onPress={() => router.replace(forgotPasswordHref)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>
                  Solicitar nuevo enlace
                </Text>
              </Pressable>
            </View>
          )}
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
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  centeredBox: {
    marginTop: 18,
    gap: 10,
  },
  statusText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 12,
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    left: 12,
    top: 16,
    zIndex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 44,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  rulesBox: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  rulesTitle: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  rulesItem: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 4,
  },
  rulesItemValid: {
    color: '#047857',
    fontWeight: '600',
  },
  passwordMismatchText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    width: '100%',
    backgroundColor: '#0089AC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
